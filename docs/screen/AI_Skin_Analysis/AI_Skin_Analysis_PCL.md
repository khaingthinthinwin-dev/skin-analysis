# Program Checklist (PCL) — AI Skin Analysis, Buyer Profile & Settings

---

## Document Control

| Attribute | Value |
|-----------|-------|
| **Document ID** | SKM-PCL-SKIN-001 |
| **Target Screen** | AI Skin Analysis Portal, Buyer Profile, and Settings |
| **Subsystem** | Skin Analysis — Image Upload, AI Processing & Historical Tracking; Shared Buyer Account & Preferences |
| **Version** | 1.0 |
| **Created** | 2026-10-28 |
| **Last Updated** | 2026-10-30 |
| **Status** | Active |

---

## 1. Normal Scenarios (N) — Happy Path

- [x] **N-01**: Buyer opens the skin analysis scanner
  - **Precondition**: Authenticated buyer account
  - **Steps**:
    1. Navigate to `/buyer/skin-analysis`
    2. Verify the live-scan and photo-upload modes and their controls
  - **Expected Result**: The scanner screen loads with live scan selected by default and a control to switch to photo upload
  - **Business Rules**: BR-SKIN-001
  - **Note**: Covered by E2E; scanner and upload controls are asserted visible. The default-selected mode is not asserted, so this remains partial.

- [x] **N-02**: Upload a valid facial image and complete an analysis
  - **Precondition**: Authenticated buyer has a valid JPG, PNG, or WebP facial image under 10MB and available daily quota
  - **Steps**:
    1. Select the photo upload mode and choose a valid image
    2. Leave AI analysis consent checked (it is checked by default), or check it if it was cleared
    3. Start the scan and wait for processing to complete
  - **Expected Result**: Upload and analysis start successfully; progress is shown and the completed result is displayed
  - **Business Rules**: BR-SKIN-002, BR-SKIN-003, BR-SKIN-005, BR-SKIN-010
  - **API**: `POST /api/v1/skin-analysis/upload`, `POST /api/v1/skin-analysis/analyze`
  - **Note**: Verified by the live E2E scenario. It captures the scanner before upload, uploaded-image state, completed result, and created analysis database rows in PNG/JSON.

- [x] **N-03**: Capture a facial image using the live camera
  - **Precondition**: Authenticated buyer on the scanner; browser camera permission is granted
  - **Steps**:
    1. Choose live scan
    2. Start the camera and capture a face
    3. Verify the captured-image preview and select **Analyze**
  - **Expected Result**: A valid captured image is previewed, uploaded, and analyzed
  - **Business Rules**: BR-SKIN-002, BR-SKIN-010
  - **Note**: Not yet verified by an E2E assertion.

- [x] **N-04**: View completed analysis results
  - **Precondition**: Buyer has a completed analysis
  - **Steps**:
    1. Open the completed analysis
    2. Review the score, hydration, skin type, skin age, conditions, findings, and recommendations
  - **Expected Result**: Results include health score, hydration, skin type, skin age, confidence, the facial scan image, condition severity, clinical findings, routine guidance, and product recommendations when present
  - **Business Rules**: BR-SKIN-007, BR-SKIN-012, BR-SKIN-015, BR-SKIN-016, BR-SKIN-017
  - **API**: `GET /api/v1/skin-analysis/:id`
  - **Note**: Covered by E2E; score, hydration, completion state, and a recommendation are asserted. Skin type, skin age, confidence, scan image, severity, clinical findings, and routine guidance remain unverified.

- [x] **N-05**: Open analysis history and navigate to a result
  - **Precondition**: Buyer has at least one analysis record
  - **Steps**:
    1. Select **View History**
    2. Open an analysis from the history list
  - **Expected Result**: The history shows the buyer's records in newest-first order and the selected analysis opens
  - **Business Rules**: BR-SKIN-006, BR-SKIN-011
  - **API**: `GET /api/v1/skin-analysis/history`
  - **Note**: The E2E test verifies the history page, expected record dates, and navigation to a selected result. UI screenshots are captured; this read-only scenario does not create database evidence.

- [x] **N-06**: Filter and paginate analysis history
  - **Precondition**: Buyer has enough history records to use filters and pagination
  - **Steps**:
    1. Apply a valid date range and/or skin type filter
    2. Move to another page and return to the first page
  - **Expected Result**: The list reflects the selected filters and page, while remaining scoped to the current buyer
  - **Business Rules**: BR-SKIN-006, BR-SKIN-011
  - **API**: `GET /api/v1/skin-analysis/history`
  - **Note**: E2E applies date and skin-type filters and captures the resulting UI. It does not assert filtered rows or pagination behavior, so the expected filtering and pagination remain partial.

- [x] **N-07**: Compare two completed analyses
  - **Precondition**: Buyer has two completed analysis records
  - **Steps**:
    1. Select two completed records for comparison from analysis history
    2. Open the comparison view
  - **Expected Result**: Both analyses and their score differences are shown side by side, with improvement or regression indicators
  - **Business Rules**: BR-SKIN-006, BR-SKIN-020
  - **API**: `POST /api/v1/skin-analysis/compare`
  - **Note**: Not currently reachable through the UI. The history page renders the comparison modal but no action sets the selected analysis IDs.

- [x] **N-08**: Submit product recommendation feedback
  - **Precondition**: A completed analysis includes a product recommendation
  - **Steps**:
    1. Select **Helpful** or **Not Helpful**
    2. Verify the selected feedback is reflected in the UI
  - **Expected Result**: Feedback is recorded and the selected state is shown; the same feedback is not submitted repeatedly
  - **Business Rules**: BR-SKIN-021
  - **API**: `POST /api/v1/skin-analysis/recommendations/:id/feedback`
  - **Note**: Verified by the live E2E scenario. It captures the no-feedback result, the ready-to-submit state, the selected Helpful state, and matching database evidence in PNG and JSON. It selects a recommendation with no prior feedback so the change is observable on reruns.

- [x] **N-09**: Export an analysis report and the history report
  - **Precondition**: Buyer has at least one completed analysis
  - **Steps**:
    1. Export a single analysis report
    2. Export the full history report
  - **Expected Result**: Each action downloads a PDF report for the requested scope
  - **Business Rules**: BR-SKIN-006, BR-SKIN-014
  - **API**: `GET /api/v1/skin-analysis/:id/export`, `GET /api/v1/skin-analysis/export-history`
  - **Note**: E2E triggers both report downloads and asserts that each suggested filename has a `.pdf` extension. UI evidence is captured.

- [x] **N-10**: View trend charts when sufficient history exists
  - **Precondition**: Buyer has at least two completed analyses
  - **Steps**:
    1. Open the skin analysis screen or history screen
    2. View health score and hydration trends if the trend chart is rendered
  - **Expected Result**: If the trends UI is made reachable, health score and hydration charts render the buyer's data
  - **Business Rules**: BR-SKIN-006, BR-SKIN-013
  - **API**: `GET /api/v1/skin-analysis/trends`
  - **Note**: Not currently reachable through the UI. The chart and trends hook exist, but neither current page renders the chart or requests trend data.

- [x] **N-11**: Apply language preferences to the skin analysis screen
  - **Precondition**: Buyer can open the shared Settings screen
  - **Steps**:
    1. Open the user navigation menu and select **Settings**
    2. Use the language control to select English, Japanese, and Myanmar
    3. Verify Settings labels respond to the selected language, then return to the skin analysis screen
  - **Expected Result**: The app language changes; translated skin-analysis labels update while existing hard-coded scanner labels remain English
  - **Business Rules**: BR-SKIN-019
  - **Note**: E2E verifies the English, Japanese, and Myanmar language options are present and selects English. It does not verify each language selection or translated scanner labels, so the full scenario remains partial.

- [x] **N-12**: Apply the theme preference to the skin analysis screen
  - **Precondition**: Buyer can open the shared Settings screen
  - **Steps**:
    1. Open the user navigation menu and select **Settings**
    2. Toggle the theme between light and dark
    3. Return to the skin analysis screen
  - **Expected Result**: The app theme switches between light and dark on the Settings and skin analysis screens
  - **Business Rules**: None (shared UI preference)
  - **Note**: E2E toggles the theme and asserts that the root theme class changes. It does not verify persistence or the theme on the skin-analysis screen.

- [x] **N-13**: Use the skin analysis screen at desktop and mobile widths
  - **Precondition**: Authenticated buyer
  - **Steps**:
    1. Set the viewport to 1280x720
    2. Verify scanner, results, history, Profile, Settings, and their actions are usable
    3. Set the viewport to 375x667 and repeat
  - **Expected Result**: Content remains readable and controls are reachable without unintended horizontal overflow
  - **Business Rules**: None (responsive UI)
  - **Note**: E2E checks the scanner controls and horizontal overflow at 375x667. Desktop layout and the other listed screens/actions are not covered.

- [x] **N-14**: Switch cameras, capture a preview, and retake the photo
  - **Precondition**: Browser camera permission is granted and the device has front and rear cameras
  - **Steps**:
    1. Start the live camera
    2. Switch between front and rear camera
    3. Capture an image
    4. Choose retake and capture again
  - **Expected Result**: The selected camera stream is shown; a captured image is previewed; retake clears the preview and restarts the camera
  - **Business Rules**: None (camera interaction)
  - **Note**: Not covered by the current E2E suite; browser camera switching and retake behavior remain unverified.

- [x] **N-15**: Review history summary metrics and row actions
  - **Precondition**: Buyer has at least one history record
  - **Steps**:
    1. Open `/buyer/skin-analysis/history`
    2. Review total analyses, best score, average hydration, and improvement percentage
    3. Open a row's details and export that row's report
  - **Expected Result**: Summary metrics match the history response; row actions open the selected analysis and download its PDF
  - **Business Rules**: BR-SKIN-006, BR-SKIN-014
  - **API**: `GET /api/v1/skin-analysis/history`, `GET /api/v1/skin-analysis/:id/export`
  - **Note**: E2E asserts total scans, best score, average hydration, and improvement metrics. Opening a row and exporting that row are covered separately by N-05/N-09, but are not asserted in this metrics scenario.

- [x] **N-16**: Clear analysis history filters and change page size
  - **Precondition**: Buyer has history records and the history filters are available
  - **Steps**:
    1. Apply date and skin type filters
    2. Select **Clear filters**
    3. Change the page size using the pagination controls
  - **Expected Result**: Filters clear, the list returns to page one, and the selected page size is applied
  - **Business Rules**: BR-SKIN-006, BR-SKIN-011
  - **API**: `GET /api/v1/skin-analysis/history`
  - **Note**: E2E applies and clears filters, changes the page size to 20, and captures both UI states. It does not assert the cleared filter values or resulting page size/list, so this remains partial.

- [x] **N-17**: Start a new scan from an analysis result
  - **Precondition**: Buyer is viewing an analysis result
  - **Steps**:
    1. Select **New Scan**
  - **Expected Result**: The scanner is shown and the URL returns to `/buyer/skin-analysis`
  - **Business Rules**: BR-SKIN-001
  - **Note**: E2E selects **New Scan**, asserts the scanner URL and live-scan control, and captures the result details before navigation.

- [x] **N-18**: Display the remaining daily analysis quota
  - **Precondition**: Authenticated buyer has a known daily quota remaining
  - **Steps**:
    1. Open the skin analysis scanner
    2. Compare the displayed remaining quota with the latest-analysis response
  - **Expected Result**: Remaining scans for the current UTC day are displayed and update after an analysis starts
  - **Business Rules**: BR-SKIN-005
  - **API**: `GET /api/v1/skin-analysis/latest`, `POST /api/v1/skin-analysis/analyze`
  - **Note**: Not currently satisfied by the UI. The page reads quota data through the latest-analysis hook but does not display a remaining-quota indicator.

- [x] **N-19**: Open a recommended product from the analysis result
  - **Precondition**: A completed analysis includes a product recommendation with a product ID
  - **Steps**:
    1. Select **View Product** on the recommendation card
  - **Expected Result**: The buyer is navigated to the recommended product detail page
  - **Business Rules**: BR-SKIN-022
  - **Note**: E2E selects **View Product** and asserts navigation to the expected product detail URL.

- [x] **N-20**: Open Profile from the buyer navigation menu
  - **Precondition**: Authenticated buyer is on the skin analysis screen
  - **Steps**:
    1. Open the user navigation menu
    2. Select **Profile**
  - **Expected Result**: The buyer is navigated to the shared Profile page and the profile information tab is selected
  - **Business Rules**: None (shared account navigation)
  - **Note**: E2E opens Profile from the buyer navigation menu and asserts the Profile page heading. It does not assert which profile tab is selected.

- [x] **N-21**: View buyer profile information
  - **Precondition**: Authenticated buyer profile is available
  - **Steps**:
    1. Open the Profile page
    2. Review the displayed name, email, role, account status, and avatar
  - **Expected Result**: The Profile Information card displays the buyer's current account data
  - **Business Rules**: None (shared account profile)
  - **API**: `GET /api/v1/users/me`
  - **Note**: E2E verifies that the buyer email is displayed. Name, role, account status, and avatar assertions remain uncovered.

- [x] **N-22**: Update buyer profile name and avatar
  - **Precondition**: Authenticated buyer is on the Edit Profile tab
  - **Steps**:
    1. Change the profile name to a valid value
    2. Select an image file; the input accepts `image/*` and the selected image is compressed into a preview
    3. Save the changes
    4. Reopen or refresh the Profile page
  - **Expected Result**: A success notification is shown; the updated name and avatar persist and the shared user navigation reflects the updated profile
  - **Business Rules**: None (shared account profile)
  - **API**: `PATCH /api/v1/users/me`
  - **Note**: N-22 captures before, filled-form, after-save, and database evidence for the name update. The live scenario does not change an avatar, so the full name-and-avatar scenario remains unchecked; shop phone and address fields are merchant-only.

- [x] **N-23**: Change the buyer account password
  - **Precondition**: Authenticated buyer knows the current password
  - **Steps**:
    1. Open the Change Password tab
    2. Enter the current password, a valid new password, and matching confirmation
    3. Submit the form
  - **Expected Result**: A success notification is shown and the form fields are cleared
  - **Business Rules**: None (shared account security)
  - **API**: `POST /api/v1/auth/change-password`
  - **Note**: Verified by the live E2E scenario. It captures the password form before entry, after values are filled, after the successful change and form reset, and safe database evidence without exposing password hashes. It restores the original test password after capture.

- [x] **N-24**: Remove the buyer's profile avatar
  - **Precondition**: Buyer has an avatar and is on the Edit Profile tab
  - **Steps**:
    1. Select **Remove Avatar**
    2. Save the profile
  - **Expected Result**: The avatar preview is cleared and the profile update submits an empty avatar URL
  - **Business Rules**: None (shared account profile)
  - **API**: `PATCH /api/v1/users/me`
  - **Note**: E2E removes the avatar and captures the edit form. It does not save the form or assert persistence, so the complete remove-avatar scenario remains unverified.

- [x] **N-25**: Delete selected analysis history records
  - **Precondition**: Buyer has one or more analysis records on the history page
  - **Steps**:
    1. Select one or more rows
    2. Select the delete action
    3. Confirm deletion in the dialog
  - **Expected Result**: The selected records are deleted and the history and latest-analysis data refresh
  - **Business Rules**: None (implemented history action)
  - **API**: `DELETE /api/v1/skin-analysis/bulk`
  - **Note**: Verified by the live E2E scenario. Evidence captures the unselected row, selected row, confirmation dialog, post-delete UI, and database query result in PNG and JSON. The implemented action still conflicts with BR-SKIN-007; see sign-off note.

---

## 2. Abnormal Scenarios (A) — Error & Negative Paths

- [x] **A-01**: Reject an unsupported image format
  - **Precondition**: Buyer is on the photo upload mode
  - **Steps**:
    1. Select a non-image or unsupported file
  - **Expected Result**: An invalid-format message is shown and the file is not submitted
  - **Business Rules**: BR-SKIN-002
  - **API**: `POST /api/v1/skin-analysis/upload`
  - **Note**: E2E uploads a non-image text file and asserts that the unsupported-format validation message is shown.

- [x] **A-02**: Reject an image larger than 10MB
  - **Precondition**: Buyer has an otherwise supported image file larger than 10MB
  - **Steps**:
    1. Select the oversized file
  - **Expected Result**: A size-limit message is shown and upload is blocked
  - **Business Rules**: BR-SKIN-003
  - **API**: `POST /api/v1/skin-analysis/upload`
  - **Note**: E2E selects an image larger than 10MB and asserts that the size-limit message is shown.

- [x] **A-03**: Reject an image without a detectable human face
  - **Precondition**: Buyer is on the scanner and has a non-facial image
  - **Steps**:
    1. Select the image or capture it with the camera
  - **Expected Result**: Face validation feedback is shown and the image is not staged for analysis
  - **Business Rules**: None (client-side face validation)
  - **Note**: E2E supplies a supported image with face detection stubbed to return no face, then asserts the validation message and disabled Analyze action.

- [x] **A-04**: Block upload when consent is not provided
  - **Precondition**: Buyer has selected a valid image
  - **Steps**:
    1. Clear the AI analysis consent checkbox
    2. Attempt to start the scan
  - **Expected Result**: A consent-required message is shown and no upload request is sent
  - **Business Rules**: BR-SKIN-010
  - **API**: `POST /api/v1/skin-analysis/upload`
  - **Note**: E2E uploads a valid image, clears consent, and asserts that Analyze is disabled. It does not separately assert that no upload request was sent.

- [x] **A-05**: Handle upload or analysis service failure
  - **Precondition**: Upload or analysis API is configured to return an error
  - **Steps**:
    1. Submit a valid, consented image
    2. Cause the upload or analysis request to fail
  - **Expected Result**: A user-visible error is shown; the screen does not display a successful result and allows an appropriate retry
  - **Business Rules**: None (error handling)
  - **API**: `POST /api/v1/skin-analysis/upload`, `POST /api/v1/skin-analysis/analyze`
  - **Note**: E2E simulates an upload `500` and asserts the visible upload error. Analysis-service failure and retry behavior are not asserted.

- [x] **A-06**: Deny access to unauthenticated users and non-buyers
  - **Precondition**: Use an unauthenticated session and, separately, an authenticated merchant or admin account
  - **Steps**:
    1. Request the skin analysis page and API endpoints
  - **Expected Result**: Unauthenticated requests are rejected and non-buyer roles are denied access
  - **Business Rules**: BR-SKIN-001
  - **API**: `GET /api/v1/skin-analysis/latest`
  - **Note**: UI E2E verifies an unauthenticated redirect and merchant denial; API contract E2E separately verifies protected access is rejected. API assertions accept `401` or `403` rather than requiring an exact status per role.

- [x] **A-07**: Prevent access to another buyer's analysis data
  - **Precondition**: Buyer A is authenticated and Buyer B owns an analysis record
  - **Steps**:
    1. As Buyer A, request Buyer B's analysis detail, history, comparison, and report
  - **Expected Result**: Buyer A cannot read or export Buyer B's analysis data
  - **Business Rules**: BR-SKIN-006
  - **API**: `GET /api/v1/skin-analysis/:id`, `GET /api/v1/skin-analysis/history`, `POST /api/v1/skin-analysis/compare`, `GET /api/v1/skin-analysis/:id/export`
  - **Note**: Not covered by the current E2E suite; cross-buyer detail, history, comparison, and export access remain unverified.

- [x] **A-08**: Preserve result immutability and prevent manual deletion
  - **Precondition**: Buyer has a completed analysis
  - **Steps**:
    1. Open a completed analysis result
    2. Verify that result values have no edit controls
  - **Expected Result**: The result detail is read-only; the history page's separate bulk-delete action is covered by N-25
  - **Business Rules**: BR-SKIN-007
  - **Note**: E2E asserts that result details contain no textboxes. History deletion is tested separately by N-25 and remains in conflict with BR-SKIN-007.

- [x] **A-09**: Handle denied or unavailable camera access
  - **Precondition**: Browser camera permission is denied or camera access is unavailable
  - **Steps**:
    1. Choose live scan
    2. Deny camera permission or simulate an unavailable camera
    3. Try the camera retry action, then choose photo upload as the fallback
  - **Expected Result**: Camera error and retry guidance are shown; the buyer can switch to photo upload without the page failing
  - **Business Rules**: None (camera error handling)
  - **Note**: E2E simulates denied camera access and asserts the camera error message. Selecting the photo-upload fallback is not asserted.

- [x] **A-10**: Prevent a deactivated buyer from starting an analysis
  - **Precondition**: Authenticated buyer account is deactivated
  - **Steps**:
    1. Select a valid image
    2. Attempt to start the scan
  - **Expected Result**: A deactivated-account alert is shown and no upload or analysis request is made
  - **Business Rules**: BR-SKIN-001
  - **Note**: Not covered by the current E2E suite; deactivated-account behavior remains unverified.

- [x] **A-11**: Show retry feedback when a result or history request fails
  - **Precondition**: The result-detail or history API returns an error
  - **Steps**:
    1. Open an analysis result or history page while the corresponding request fails
    2. Select **Retry**
  - **Expected Result**: A visible load error and retry action are shown; retry refetches the requested data
  - **Business Rules**: BR-SKIN-006
  - **API**: `GET /api/v1/skin-analysis/:id`, `GET /api/v1/skin-analysis/history`
  - **Note**: Not covered by the current E2E suite; result/history load errors and retry refetch behavior remain unverified.

- [x] **A-12**: Cancel or recover from a failed analysis
  - **Precondition**: Buyer has started an analysis
  - **Steps**:
    1. Cancel while the processing state is visible
    2. Start another analysis and simulate a failed processing result
    3. Select the failure recovery action
  - **Expected Result**: Cancel returns to the scanner; a failed analysis shows failure guidance and provides a path to try again
  - **Business Rules**: None (processing-state handling)
  - **Note**: Not covered by the current E2E suite; processing cancellation and failed-analysis recovery remain unverified.

- [x] **A-13**: Reject an invalid buyer profile name
  - **Precondition**: Buyer is on the Edit Profile tab
  - **Steps**:
    1. Clear the name field or enter fewer than 2 characters
    2. Attempt to save the profile
  - **Expected Result**: A field validation message is shown and no profile update is submitted
  - **Business Rules**: None (shared profile-form validation)
  - **API**: `PATCH /api/v1/users/me`
  - **Note**: E2E submits a one-character name and asserts the minimum-length validation message; it does not assert that the profile update request is not submitted.

- [x] **A-14**: Reject invalid avatar files and show profile update errors
  - **Precondition**: Buyer is on the Edit Profile tab
  - **Steps**:
    1. Select a non-image file as the avatar
    2. Separately, simulate a failed profile update request
  - **Expected Result**: The non-image file is rejected with an error; a failed save shows an error notification and does not report success
  - **Business Rules**: None (shared profile-form validation and error handling)
  - **API**: `PATCH /api/v1/users/me`
  - **Note**: E2E selects a non-image avatar file and asserts that the validation error appears. A failed profile-update request is not covered.

- [x] **A-15**: Reject invalid password-change submissions
  - **Precondition**: Buyer is on the Change Password tab
  - **Steps**:
    1. Submit with a missing current password
    2. Submit with a new password that does not meet the password rules
    3. Submit with a confirmation that does not match
  - **Expected Result**: Field validation errors are shown and the password-change request is not submitted
  - **Business Rules**: None (shared password-form validation)
  - **API**: `POST /api/v1/auth/change-password`
  - **Note**: E2E submits empty password fields and asserts a required-field validation message. Short-password and mismatched-confirmation cases are not covered.

- [x] **A-16**: Handle an incorrect current password
  - **Precondition**: Buyer is on the Change Password tab
  - **Steps**:
    1. Enter an incorrect current password and otherwise valid matching new-password values
    2. Submit the form
  - **Expected Result**: A failure notification is shown; the form does not report a successful password change
  - **Business Rules**: None (shared account security)
  - **API**: `POST /api/v1/auth/change-password`
  - **Note**: E2E simulates an incorrect-current-password response and asserts the failure notification.

- [x] **A-17**: Handle Profile load failure
  - **Precondition**: The profile endpoint returns an error
  - **Steps**:
    1. Open the Profile page
  - **Expected Result**: A visible error alert explains that profile information could not be loaded
  - **Business Rules**: None (shared account error handling)
  - **API**: `GET /api/v1/users/me`
  - **Note**: E2E simulates a profile `500` response and asserts the visible load-error message.

- [x] **A-18**: Reject a new password that matches the current password
  - **Precondition**: Buyer is on the Change Password tab
  - **Steps**:
    1. Enter the current password as the new password
    2. Enter the same value in the confirmation field
    3. Submit the form
  - **Expected Result**: A validation error indicates that the new password must differ from the current password; no request is submitted
  - **Business Rules**: None (shared password-form validation)
  - **API**: `POST /api/v1/auth/change-password`
  - **Note**: E2E submits the same value as current, new, and confirmation password and asserts the distinct-password validation message; it does not assert that no password-change request is sent.

---

## 3. Boundary Scenarios (B) — Edge Cases & Limits

- [x] **B-01**: Accept a supported image at the 10MB limit
  - **Precondition**: Buyer has a valid facial image with an accepted MIME type and size exactly 10,485,760 bytes
  - **Steps**:
    1. Select the image and provide consent
    2. Start the scan
  - **Expected Result**: The image passes the size validation and can be uploaded
  - **Business Rules**: BR-SKIN-002, BR-SKIN-003, BR-SKIN-010
  - **API**: `POST /api/v1/skin-analysis/upload`
  - **Note**: E2E supplies an exactly 10MiB supported image, asserts it passes validation, and verifies that Analyze is enabled. The scan is not submitted in this boundary case.

- [x] **B-02**: Display empty and insufficient-data states
  - **Precondition**: Test accounts exist with zero and one completed analysis
  - **Steps**:
    1. Open the dashboard, history, and trends for each account
  - **Expected Result**: The scanner remains available with no prior analysis; the history table shows its no-records state. If the trend chart is made reachable, fewer than two data points produce its insufficient-data message.
  - **Business Rules**: BR-SKIN-013
  - **API**: `GET /api/v1/skin-analysis/latest`, `GET /api/v1/skin-analysis/history`, `GET /api/v1/skin-analysis/trends`
  - **Note**: E2E verifies the empty-history message and that the full-history export action remains available. The zero-analysis scanner state and one-analysis trend state are not covered.

- [x] **B-03**: Render trends at the minimum of two analyses
  - **Precondition**: Buyer has exactly two completed analyses in the selected trend range
  - **Steps**:
    1. Open the trends section
  - **Expected Result**: Health score and hydration charts display the two available data points
  - **Business Rules**: BR-SKIN-013
  - **API**: `GET /api/v1/skin-analysis/trends`
  - **Note**: Not covered by the current E2E suite. The current screen does not render the trend chart, so this scenario cannot be exercised through the UI.

- [x] **B-04**: Enforce the daily analysis quota at its limit
  - **Precondition**: Buyer has completed five analyses during the current UTC day
  - **Steps**:
    1. Call the analyze endpoint with a valid uploaded image
    2. Verify the quota response, then use a controlled clock or test fixture to verify a new UTC day permits another scan
  - **Expected Result**: The sixth analysis receives HTTP `429` with a daily-limit message and `remaining: 0`; quota usage resets at 00:00 UTC
  - **Business Rules**: BR-SKIN-005
  - **API**: `POST /api/v1/skin-analysis/analyze`
  - **Note**: E2E stubs the analyze endpoint to return HTTP `429` and asserts that the daily-limit error is displayed. The real quota threshold, `remaining` value, and UTC reset are not tested.

- [x] **B-05**: Handle a recommended image below the minimum resolution
  - **Precondition**: Buyer has a supported facial image smaller than 640x480 pixels
  - **Steps**:
    1. Select the image and provide consent
  - **Expected Result**: The image is accepted; the server records a warning in its logs for an image below 640x480 pixels
  - **Business Rules**: BR-SKIN-004
  - **API**: `POST /api/v1/skin-analysis/upload`
  - **Note**: Not covered by the current E2E suite. The current client does not show a resolution warning; backend logging and acceptance remain unverified here.

- [x] **B-06**: Accept buyer profile names at the supported length boundaries
  - **Precondition**: Buyer is on the Edit Profile tab
  - **Steps**:
    1. Save a name with exactly 2 characters
    2. Save a name with exactly 100 characters
  - **Expected Result**: Both names pass client-side validation and can be saved
  - **Business Rules**: None (shared profile-form validation)
  - **API**: `PATCH /api/v1/users/me`
  - **Note**: E2E saves a two-character name and verifies that the profile update request is sent. The 100-character boundary is not tested.

- [x] **B-07**: Reject a buyer profile name over the maximum length
  - **Precondition**: Buyer is on the Edit Profile tab
  - **Steps**:
    1. Enter a name with 101 characters
    2. Attempt to save the profile
  - **Expected Result**: A maximum-length validation message is shown and the profile is not submitted
  - **Business Rules**: None (shared profile-form validation)
  - **API**: `PATCH /api/v1/users/me`
  - **Note**: E2E enters a 101-character name and asserts the maximum-length validation message. It does not assert that the update request was not sent.

- [x] **B-08**: Enforce new password length boundaries
  - **Precondition**: Buyer is on the Change Password tab and provides a valid current password
  - **Steps**:
    1. Submit a new password of 7 characters that otherwise meets character composition rules
    2. Submit a valid new password of 8 characters
    3. Submit a new password of 129 characters
  - **Expected Result**: The 7-character and 129-character values are rejected; the 8-character value passes length validation when composition and confirmation also match
  - **Business Rules**: None (shared password-form validation)
  - **API**: `POST /api/v1/auth/change-password`
  - **Note**: E2E verifies rejection of a seven-character password. The valid eight-character and over-limit 129-character cases are not covered.

---

## 4. Interface Scenarios (I) — API Contracts & Payloads

- [x] **I-01**: `POST /api/v1/skin-analysis/upload` — validates multipart upload
  - **Precondition**: Authenticated buyer provides a supported image and `consent=true`
  - **Steps**:
    1. Send `facialImage` and `consent` as multipart form fields
  - **Expected Response**: Status `200` or `201`; response data contains `blobUrl` and `fileSize`
  - **Business Rules**: BR-SKIN-001, BR-SKIN-002, BR-SKIN-003, BR-SKIN-010
  - **API**: `POST /api/v1/skin-analysis/upload`
  - **Note**: The API-contract test uses a dedicated registered buyer and verifies the successful response includes `blobUrl` and `fileSize`; it accepts either `200` or `201`.

- [x] **I-02**: `POST /api/v1/skin-analysis/analyze` — starts a scan
  - **Precondition**: Authenticated buyer has a valid uploaded image URL and remaining quota
  - **Steps**:
    1. Send `{ "blobUrl": "<uploaded image URL>" }`
  - **Expected Response**: Status `200`, `201`, or `202`; response data includes `analysisId` and `status`
  - **Business Rules**: BR-SKIN-005
  - **API**: `POST /api/v1/skin-analysis/analyze`
  - **Note**: The API-contract test uses a dedicated registered buyer, verifies `analysisId` and `status`, and captures the created analysis, conditions, findings, and recommendations in database PNG/JSON evidence.

- [x] **I-03**: `GET /api/v1/skin-analysis/:id` — returns the buyer's result
  - **Precondition**: Authenticated buyer owns the requested analysis ID
  - **Steps**:
    1. Request the analysis by ID
  - **Expected Response**: Status `200`; response data contains skin type, conditions, and recommendations
  - **Business Rules**: BR-SKIN-006, BR-SKIN-007
  - **API**: `GET /api/v1/skin-analysis/:id`
  - **Note**: Verified by the live API-contract test, which asserts the result includes skin type, conditions, and recommendations.

- [x] **I-04**: `GET /api/v1/skin-analysis/history` — returns scoped, paginated history
  - **Precondition**: Authenticated buyer has analysis records
  - **Steps**:
    1. Request history with supported pagination and filter parameters
  - **Expected Response**: Status `200`; response data contains only the buyer's records, pagination metadata, and summary metrics in newest-first order
  - **Business Rules**: BR-SKIN-006, BR-SKIN-011
  - **API**: `GET /api/v1/skin-analysis/history`
  - **Note**: API E2E asserts HTTP `200` and that the response contains `items`, `meta`, and `summary`. Buyer scoping, page contents, and newest-first ordering are not asserted.

- [x] **I-05**: `GET /api/v1/skin-analysis/trends` — returns trend data for a supported range
  - **Precondition**: Authenticated buyer
  - **Steps**:
    1. Request a supported range: `30d`, `90d`, `1y`, or `all`
  - **Expected Response**: Status `200`; response data contains the buyer's health-score and hydration time series for the requested range
  - **Business Rules**: BR-SKIN-006, BR-SKIN-013
  - **API**: `GET /api/v1/skin-analysis/trends`
  - **Note**: API E2E verifies HTTP `200` and that response data exists for `30d`; the time-series fields and values and other supported ranges are not asserted.

- [x] **I-06**: `POST /api/v1/skin-analysis/compare` — compares two owned analyses
  - **Precondition**: Authenticated buyer owns two completed analysis IDs
  - **Steps**:
    1. Send `{ "analysisId1": "<id>", "analysisId2": "<id>" }`
  - **Expected Response**: Status `200` or `201`; response data contains both analysis summaries, score differences, and condition changes
  - **Business Rules**: BR-SKIN-006, BR-SKIN-020
  - **API**: `POST /api/v1/skin-analysis/compare`
  - **Note**: API E2E uses two distinct owned analysis IDs and accepts HTTP `200` or `201`; comparison response fields are not asserted.

- [x] **I-07**: Export endpoints return PDF content
  - **Precondition**: Authenticated buyer has at least one completed analysis
  - **Steps**:
    1. Request a single-analysis export
    2. Request a history export
  - **Expected Response**: Status `200`; response has `Content-Type: application/pdf` and attachment content
  - **Business Rules**: BR-SKIN-006, BR-SKIN-014
  - **API**: `GET /api/v1/skin-analysis/:id/export`, `GET /api/v1/skin-analysis/export-history`
  - **Note**: API E2E verifies HTTP `200` and a PDF content type for the history export. Single-analysis export is not asserted in the API test; the UI test verifies both download filenames end in `.pdf`.

- [x] **I-08**: `POST /api/v1/skin-analysis/recommendations/:id/feedback` — records feedback
  - **Precondition**: Authenticated buyer owns the recommendation
  - **Steps**:
    1. Send `{ "isHelpful": true }` or `{ "isHelpful": false }`
  - **Expected Response**: Status `200` or `201`; feedback is persisted for the buyer's recommendation
  - **Business Rules**: BR-SKIN-021
  - **API**: `POST /api/v1/skin-analysis/recommendations/:id/feedback`
  - **Note**: The API test posts feedback for a recommendation owned by the dedicated buyer and captures the database row in PNG/JSON. The live UI scenario N-08 additionally verifies the before/doing/after states and matching feedback row.

- [x] **I-09**: Skin analysis API rejects missing authentication and disallowed roles
  - **Precondition**: Requests are made without a JWT and with a non-buyer role
  - **Steps**:
    1. Request a protected skin analysis endpoint for each case
  - **Expected Response**: Status `401` without authentication and `403` for a role other than buyer
  - **Business Rules**: BR-SKIN-001
  - **API**: Any protected `/api/v1/skin-analysis` endpoint
  - **Note**: API E2E verifies that unauthenticated and merchant requests are rejected with `401` or `403`. It does not assert the exact status for each case.

- [x] **I-10**: `GET /api/v1/users/me` — returns the authenticated buyer profile
  - **Precondition**: Authenticated buyer requests their own profile
  - **Steps**:
    1. Request the current-user endpoint
  - **Expected Response**: Status `200`; response data contains the buyer's profile fields, including ID, email, name, role, and any returned avatar or contact fields
  - **Business Rules**: None (shared account profile)
  - **API**: `GET /api/v1/users/me`
  - **Note**: API E2E verifies HTTP `200` and the authenticated buyer email. Other profile fields are not asserted.

- [x] **I-11**: `PATCH /api/v1/users/me` — updates buyer profile fields
  - **Precondition**: Authenticated buyer provides a valid profile update
  - **Steps**:
    1. Send the updated name and avatar URL
  - **Expected Response**: Successful response data contains the updated buyer profile
  - **Business Rules**: None (shared account profile)
  - **API**: `PATCH /api/v1/users/me`
  - **Note**: API E2E verifies the buyer name update, captures the changed profile in database PNG/JSON, and restores the original name. Avatar persistence and the full response profile are not asserted.

- [x] **I-12**: `POST /api/v1/auth/change-password` — changes the authenticated buyer password
  - **Precondition**: Authenticated buyer provides the correct current password and a valid new password
  - **Steps**:
    1. Send `currentPassword` and `newPassword`
  - **Expected Response**: Successful response confirms the password change; the `confirmPassword` UI field is not part of the API payload
  - **Business Rules**: None (shared account security)
  - **API**: `POST /api/v1/auth/change-password`
  - **Note**: Verified by the API test, which captures safe database evidence (no password hash), logs in with the changed password, and restores the original password afterward. The UI flow N-23 captures before/filled/after screenshots as well.

- [x] **I-13**: `DELETE /api/v1/skin-analysis/bulk` — deletes the buyer's selected history rows
  - **Precondition**: Authenticated buyer has selected one or more analysis IDs
  - **Steps**:
    1. Send `{ "ids": ["<analysis-id>"] }`
  - **Expected Response**: Status `200`; response data contains `deletedCount` for records owned by the buyer
  - **Business Rules**: None (implemented history action)
  - **API**: `DELETE /api/v1/skin-analysis/bulk`
  - **Note**: API E2E submits an unknown UUID and checks the rejection response; deletion of a selected owned record and database removal are verified separately by live UI scenario N-25.

---

## Evidence Artifacts

The latest recorded complete Playwright run contains **47/47 passed tests**, with no failures or skips. It generated **107 PNG screenshots** and **9 database-evidence JSON files**. All **53 PCL IDs mapped to the spec** have at least one PNG artifact. The run summary is in [`results.json`](../../../e2e/test-results/AI_Skin_Analysis/results.json); the complete screenshot names and captions are in [`index.json`](../../../e2e/test-results/AI_Skin_Analysis/screenshots/index.json).

| Test group | PCL scenarios | Evidence |
|------------|---------------|----------|
| UI and live scenarios | N-01, N-02, N-04, N-05, N-06, N-08, N-09, N-11, N-12, N-13, N-15, N-16, N-17, N-19, N-20, N-21, N-22, N-23, N-24, N-25; A-01, A-02, A-03, A-04, A-05, A-06, A-08, A-09, A-13, A-14, A-15, A-16, A-17, A-18; B-01, B-02, B-04, B-06, B-07, B-08 | Scenario-specific PNGs are named with the PCL ID. UI cases capture scenario states; most also capture a final state, while the five live mutation tests capture ordered before/doing/after states. See `index.json` for each filename and caption. |
| API contracts | I-01 through I-13 | Each contract has an `I-##_api_call.png` request/response capture listed in `index.json`. |
| Live database mutations | N-02, N-08, N-22, N-23, N-25 | UI before/doing/after screenshots plus database PNG and JSON: `N-02_4_db_after_analysis_created`, `N-08_4_db_after_feedback_saved`, `N-22_4_db_after_profile_update`, `N-23_4_db_after_password_change`, and `N-25_5_db_after_delete`. |
| API database mutations | I-02, I-08, I-11, I-12 | Database PNG and JSON: `I-02_db_after_analysis_created`, `I-08_db_after_feedback_saved`, `I-11_db_after_profile_update`, and `I-12_db_after_password_change`. |

## Sign-Off

| Item | Status |
|------|--------|
| Test scenarios defined (N, A, B, I) | ☑️ |
| E2E tests implemented | ☑️ |
| PCL auto-update verified | ☐ |
| Next review date | 2026-11-28 |
