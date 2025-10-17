import { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";
import { JIRA_API_BASE_URL, JIRA_PROJECT_ID, JIRA_PROJECT_ISSUE_TYPE_ID } from "./configuration";

interface TestResultData {
	suite: string;
	name: string;
	id: string;
	status: string;
	duration: string;
	steps: string[];
	screenshotPath?: string;
	videoPath?: string;
	tracePath?: string;
	error?: string;
	detailsPath?: string;
}

export default class CustomReporter implements Reporter {
	private readonly isJenkins: boolean = !!process.env.JENKINS;
	private readonly jenkinsTestResultsPath = process.env.JENKINS_TEST_RESULTS;
	private readonly jenkinsReportsPath = process.env.JENKINS_URL;
	private readonly results: TestResultData[] = [];
	private readonly environment: string = process.env.ENVIRONMENT?.toUpperCase() ?? "UNKNOWN";

	removeAppFromFilePath = (url: string) => {
		return url.replace(/^\/app\//, "");
	};
	generatePathForTestResults = (url: string | undefined) => {
		if (this.isJenkins && this.jenkinsTestResultsPath && url) {
			const testResultsUrl = this.removeAppFromFilePath(url);
			return `${this.jenkinsTestResultsPath}/${testResultsUrl}`;
		}
		return url;
	};

	onTestEnd = (test: TestCase, result: TestResult): void => {
		const cleanError = (msg: string): string => msg.replace(/\x1b\[[0-9;]*m/g, "");

		if (["failed", "timedOut", "interrupted"].includes(result.status)) {
			result.status = "failed";
		}

		const errorSnippet = result.errors?.map((err) => cleanError(err.stack!)).join("\n") || "";

		const playwrightReportDir = this.jenkinsReportsPath
			? this.removeAppFromFilePath(this.jenkinsReportsPath)
			: path.resolve(__dirname, "../reports");
		const details = `${playwrightReportDir}/playwright-report/index.html#?testId=${test.id}`;
		const screenshot = this.generatePathForTestResults(
			result.attachments.find((a) => a.name === "screenshot" && a.path)?.path,
		);
		const video = this.generatePathForTestResults(result.attachments.find((a) => a.name === "video" && a.path)?.path);
		const trace = this.generatePathForTestResults(result.attachments.find((a) => a.name === "trace" && a.path)?.path);

		const steps = result.steps
			.filter((step) => step.category === "test.step")
			.map((step) => step.title)
			.filter(Boolean);

		this.results.push({
			suite: test.parent?.title ?? "Unknown",
			name: test.title,
			id: test.id,
			status: result.status,
			duration: `${(result.duration / 1000).toFixed(2)}s`,
			steps: steps,
			screenshotPath: screenshot,
			videoPath: video,
			tracePath: trace,
			error: errorSnippet,
			detailsPath: details,
		});
	};

	// Generate HTML report based on collected results
	private generateReport = (): void => {
		const passed = this.results.filter((r) => r.status === "passed").length;
		const failed = this.results.filter((r) => r.status === "failed").length;
		const skipped = this.results.filter((r) => r.status === "skipped").length;
		const total = this.results.length;

		const generateRows = (includeActionButtons: boolean) =>
			this.results
				.sort((a, b) => {
					// Sort by suite
					return a.suite.localeCompare(b.suite);
				})
				.map((r, idx) => this.generateReportRow(r, idx, includeActionButtons))
				.join("");

		const customerReport = this.generateHTMLContent(generateRows(false), passed, failed, skipped, total, false);

		const detailedReport = this.isJenkins
			? this.generateHTMLContent(generateRows(true), passed, failed, skipped, total, true)
			: "";

		this.saveReports(detailedReport, customerReport);
	};

	// Helper function to generate an individual row for the table
	private generateReportRow = (r: TestResultData, idx: number, includeActionButtons: boolean): string => {
		const projectId = JIRA_PROJECT_ID ?? null;
		const issueTypeId = JIRA_PROJECT_ISSUE_TYPE_ID ?? null;
		const jiraBaseUrl = JIRA_API_BASE_URL ?? null;

		const encodedData = Buffer.from(
			JSON.stringify({
				name: r.name,
				steps: r.steps,
				screenshot: r.screenshotPath ?? "",
				video: r.videoPath ?? "",
				trace: r.tracePath ?? "",
				error: r.error || "",
				details: r.detailsPath,
			}),
		).toString("base64");

		const bugButtonColumn = includeActionButtons
			? r.status === "failed"
				? `<td>
    <button onclick="createBug(${idx}, '${jiraBaseUrl}', '${projectId}', '${issueTypeId}')">Create Bug</button>
		<input type="hidden" id="bug-data-${idx}" value="${encodedData}" />
      </td>`
				: "<td></td>"
			: "";

		const viewBtn = includeActionButtons
			? `<td><a href="playwright-report/index.html#?testId=${r.id}" target="_blank" style="text-decoration: none;">
    <button>
     View details
    </button>
  </a>`
			: ` <td><button onclick="toggleSteps(${idx})">View Steps</button></td>`;

		return `
      <tr>
        <td>${idx + 1}</td>
        <td>${r.suite}</td>
        <td>${r.name}</td>
        <td><span class="badge ${r.status}">${r.status.toUpperCase()}</span></td>
        <td>${r.duration}</td>
       ${viewBtn}
       ${bugButtonColumn}
      </tr>
		
      <tr id="steps-${idx}" class="steps-row">
        <td colspan="9">
          <div class="steps-content">
            <strong>Steps:</strong>
            <ul>${r.steps.map((step) => `<li>${step}</li>`).join("")}</ul>
          </div>
        </td>
      </tr>
    `;
	};

	// Helper function to generate the complete HTML structure for the report
	private generateHTMLContent = (
		rows: string,
		passed: number,
		failed: number,
		skipped: number,
		total: number,
		includeActionButtons: boolean,
	): string => {
		// Calculate percentage for each status
		const passedPercentage = ((passed / total) * 100).toFixed(2);
		const failedPercentage = ((failed / total) * 100).toFixed(2);
		const skippedPercentage = ((skipped / total) * 100).toFixed(2);

		const downloadAndLinksSection = includeActionButtons
			? `
  <div class="report-buttons">
    
     <a href="playwright-report/index.html" target="_blank" style="text-decoration: none;">
    <button>
      Open Playwright Report
    </button>
  </a>
    <a href="index.html" download="custom-report.html">
    <button>Download Report</button>
  </a>
  </div>
  `
			: "";

		return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <title>Test Report</title>
        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
        <style>
          body { font-family: 'Arial', sans-serif; background: #f4f6f8; padding: 20px; }
          .header-container { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
          .header-container img { height: 50px; }
          .header-info { text-align: center; }
          .top-section {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            gap: 40px;
          }
          .project-info {
            flex: 1;
            background: #fff;
            padding: 15px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
            border-radius: 8px;
          }
          .summary-and-chart {
            display: flex;
            flex-direction: column;
            align-items: center;
            flex: 1;
            background: #fff;
            padding: 15px;
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05);
            border-radius: 8px;
          }
          .chart-container {
            width: 300px;
            height: 300px;
            margin-top: 20px;
          }
            .report-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-bottom: 0px;
}
            .report-buttons > a > button {
  padding: 12px;
}

          table { width: 100%; border-collapse: collapse; margin-top: 30px; background: #fff; box-shadow: 0 4px 8px rgba(0, 0, 0, 0.05); }
          th, td { padding: 12px 15px; border: 1px solid #ddd; text-align: center; }
          th { background-color: #3f51b5; color: white; }
          .badge { padding: 4px 8px; border-radius: 5px; color: white; font-size: 12px; }
          .badge.passed { background: #4caf50; }
          .badge.failed { background: #f44336; }
          .badge.skipped { background: #ff9800; }
          button { padding: 6px 12px; background: #2196f3; color: white; border: none; border-radius: 5px; cursor: pointer; }
          button:hover { background: #1976d2; }
          .steps-row { display: none; background: #eef; }
          .steps-content { padding: 15px; text-align: left; }
        </style>
      </head>
      <body>
  
      <div class="header-container">
        <div class="header-info">
          <h1>Test Report</h1>
        </div>
        ${downloadAndLinksSection}
      </div>
  
      <div class="top-section">
        <div class="project-info">
          <h3>Project Info</h3>
          <p><strong>Environment:</strong> ${this.environment}</p>
          <p><strong>Execution Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
  
        <div class="summary-and-chart">
          <div class="summary">
            <h2>Test Results Summary</h2>
            <p><strong>Total:</strong> ${total} | <strong>Passed:</strong> ${passed} | <strong>Failed:</strong> ${failed} | <strong>Skipped:</strong> ${skipped}</p>
          </div>
          <div class="chart-container">
            <canvas id="donutChart" width="300" height="300"></canvas>
          </div>
        </div>
      </div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Suite</th>
            <th>Test Name</th>
            <th>Status</th>
            <th>Duration</th>
            ${includeActionButtons ? "<th>Details</th>" : "<th>Steps</th>"}
            ${includeActionButtons ? "<th>Actions</th>" : ""}
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
  
      <script>
      const centerTextPlugin = {
  id: 'centerText',
  beforeDraw(chart) {
    const { width } = chart;
    const { height } = chart;
    const ctx = chart.ctx;
    ctx.restore();
    ctx.font = 1.25 + 'em Arial';
    ctx.textBaseline = "middle";
    ctx.textAlign = "center";

    const x = width / 2;
    const y = height / 2;

    ctx.fillStyle = '#4caf50'; // Passed color
    ctx.fillText("${passedPercentage}%", x, y - 40);

    ctx.fillStyle = '#f44336'; // Failed color
    ctx.fillText("${failedPercentage}%", x, y - 10);

    ctx.fillStyle = '#ff9800'; // Skipped color
    ctx.fillText("${skippedPercentage}%", x, y + 20);

    ctx.save();
  }
};

      const ctx = document.getElementById('donutChart').getContext('2d');
      new Chart(ctx, {
        type: 'doughnut',
        data: {
          labels: ['Passed', 'Failed', 'Skipped'],
          datasets: [{
            data: [${passed}, ${failed}, ${skipped}],
            backgroundColor: ['#4caf50', '#f44336', '#ff9800'],
            hoverOffset: 4
          }]
        },
        options: {
          responsive: true,
          plugins: {
            legend: { position: 'bottom' },
            tooltip: {
              callbacks: {
                label: function(tooltipItem) {
                  const percentage = ((tooltipItem.raw / ${total}) * 100).toFixed(2);
                  return ' ' + tooltipItem.label + ': ' + percentage + '%';
                }
              }
            }
          }
        },
          plugins: [centerTextPlugin]
      });
        function toggleSteps(idx) {
        const row = document.getElementById('steps-' + idx);
        row.style.display = row.style.display === 'table-row' ? 'none' : 'table-row';
      }
</script>
     
 <script>
  function createBug(index, jiraBaseUrl, projectId, issueTypeId) {
   const element = document.getElementById('bug-data-' + index);
    const encoded = element.value;
    const data = JSON.parse(atob(encoded));

    const summary = encodeURIComponent('Bug: ' + data.name);

    let description = '{code}Steps to Reproduce:\\n\\n' + data.steps.map((s, i) => (i + 1) + '. ' + s).join('\\n\\n')+ '\\n{code}';

    if (data.screenshot) description += '\\n\\n*Screenshot:* (' + data.screenshot + ')';
    if (data.video) description += '\\n\\n*Video:* (' + data.video + ')';
    if (data.trace) description += '\\n\\n*Trace:* (' + data.trace + ')';
    if (data.details) description += '\\n\\n*Details:* (' + data.details + ')';
    
    if (data.error) {
      description += '\\n\\n{code}\\n' + data.error + '\\n{code}';
    }

	const jiraUrl = jiraBaseUrl + '/secure/CreateIssueDetails%21init.jspa?pid=' + projectId + '&issuetype=' + issueTypeId + '&summary=' + summary + '&description='+ encodeURIComponent(description);
    window.open(jiraUrl, '_blank');
  }
</script>


      </body>
      </html>
    `;
	};

	private displayGeneratedReportHelperInfo = (reportPath: string) => {
		console.log(`> Custom test Report Generated: ${reportPath}`);
		if (!this.isJenkins) {
			console.log(`> To open custom test report run:

		  npm run test:report:custom
		  `);
		}
	};

	// Save generated report to disk
	private async saveReports(detailedReport: string, customerReport: string): Promise<void> {
		const reportDir = process.env.CUSTOM_REPORT_DIR || "reports";

		fs.mkdirSync(reportDir, { recursive: true });

		fs.writeFileSync(path.join(reportDir, "index.html"), customerReport);
		if (this.isJenkins && detailedReport !== "") {
			fs.writeFileSync(path.join(reportDir, "detailed-report.html"), detailedReport);
			this.displayGeneratedReportHelperInfo(`${reportDir}/detailed-report.html`);
		} else {
			this.displayGeneratedReportHelperInfo(`${reportDir}/index.html`);
		}
	}

	// Called when tests are complete
	onEnd(): void {
		this.generateReport();
	}
}
