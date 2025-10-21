pipeline {
    agent any

    environment {
        PLAYWRIGHT_IMAGE = 'mcr.microsoft.com/playwright:v1.56.1-noble'
        WORK_DIR = '/app'
        REPORT_DIR = 'reports/'
        BASE_URL = 'https://your-jenkins-instance.com' // Replace with your Jenkins base URL
    }

    stages {
        stage('Safe Clean Workspace') {
            steps {
                sh '''
                    docker run --rm -v "$PWD":/app -w /app alpine sh -c "rm -rf * .??*"
                '''
            }
        }

        stage('Checkout') {
            steps {
                deleteDir()
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh """
                    docker pull ${PLAYWRIGHT_IMAGE}
                    docker run --rm \
                        -v "${env.WORKSPACE}:${WORK_DIR}" \
                        -w ${WORK_DIR} \
                        ${PLAYWRIGHT_IMAGE} bash -c '
                            npm ci
                            npx playwright install
                        '
                """
            }
        }

        stage('Run Tests') {
            steps {
                catchError(buildResult: 'FAILURE', stageResult: 'FAILURE') {
                    script {
                        def testUrl = ''
                        def testUser = ''
                        def testPass = ''

                        try {
                            withCredentials([
                string(credentialsId: 'TEST_URL', variable: 'TEST_URL'),
                usernamePassword(credentialsId: 'TEST_CREDENTIALS', usernameVariable: 'TEST_USERNAME', passwordVariable: 'TEST_PASSWORD')
              ]) {
                                testUrl = env.TEST_URL
                                testUser = env.TEST_USERNAME
                                testPass = env.TEST_PASSWORD
                                echo 'Credentials injected'
              }
            } catch (ignored) {
                            echo 'No credentials found, using defaults'
                        }

                        def jobPath = env.JOB_NAME.tokenize('/').collect { "job/${it.replaceAll(' ', '%20')}" }.join('/')
                        def reportUrl = "${BASE_URL}/${jobPath}/${env.BUILD_NUMBER}"

                        sh """
              docker run --rm \
                -v "${env.WORKSPACE}:${WORK_DIR}" \
                -w ${WORK_DIR} \
                -e JENKINS=true \
                -e ENVIRONMENT="${params.ENVIRONMENT}" \
                -e PLAYWRIGHT_HTML_REPORT_DIR="${REPORT_DIR}/playwright-report" \
                -e CUSTOM_REPORT_DIR="${REPORT_DIR}" \
                -e JENKINS_URL="${reportUrl}" \
                -e JENKINS_TEST_RESULTS="${reportUrl}/artifact" \
                -e URL="${testUrl}" \
                -e USERNAME="${testUser}" \
                -e PASSWORD="${testPass}" \
                ${PLAYWRIGHT_IMAGE} bash -c '
                  mkdir -p "${REPORT_DIR}"
                  npx playwright test --project=chromium
                '
            """
                    }
                }
            }
        }

        stage('Publish HTML Report') {
            steps {
                publishHTML(target: [
          reportName: 'Test Results Dashboard',
          reportDir: "${REPORT_DIR}",
          reportFiles: 'detailed-report.html',
          keepAll: true,
          alwaysLinkToLastBuild: true,
          allowMissing: false,
          escapeHtml: false
        ])
            }
        }
    }
}
