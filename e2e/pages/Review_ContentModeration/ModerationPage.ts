import type { Page, Locator } from '@playwright/test';

function statCard(page: Page, label: string): Locator {
  return page.locator('[role="button"]').filter({ hasText: label }).first();
}

function dialog(page: Page, title: string): Locator {
  return page.getByRole('dialog').filter({ hasText: title });
}

export class ReviewModerationPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly reviewsTab: Locator;
  readonly reportsTab: Locator;
  readonly totalCard: Locator;
  readonly pendingCard: Locator;
  readonly approvedCard: Locator;
  readonly rejectedCard: Locator;
  readonly table: Locator;
  readonly searchInput: Locator;
  readonly sortSelect: Locator;
  readonly selectAllCheckbox: Locator;
  readonly bulkBar: Locator;
  readonly bulkApproveButton: Locator;
  readonly bulkRejectButton: Locator;
  readonly bulkDeleteButton: Locator;
  readonly reviewDetailDialog: Locator;
  readonly detailApproveButton: Locator;
  readonly detailRejectButton: Locator;
  readonly detailRejectReasonTextarea: Locator;
  readonly deleteConfirmDialog: Locator;
  readonly confirmDeleteButton: Locator;
  readonly reportTotalCard: Locator;
  readonly reportPendingCard: Locator;
  readonly reportDetailDialog: Locator;
  readonly reportAdminNoteTextarea: Locator;
  readonly reportResolveButton: Locator;
  readonly reportRejectButton: Locator;
  readonly rowsPerPageSelect: Locator;
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Review & Report Management' });
    this.subtitle = page.getByText('Moderate product reviews and reports');
    this.reviewsTab = page.getByRole('tab', { name: 'Reviews' });
    this.reportsTab = page.getByRole('tab', { name: 'Reports' });
    this.totalCard = statCard(page, 'Total Reviews');
    this.pendingCard = statCard(page, 'Pending');
    this.approvedCard = statCard(page, 'Approved');
    this.rejectedCard = statCard(page, 'Rejected');
    this.table = page.locator('table');
    this.searchInput = page.getByPlaceholder('Search reviews by user, product, or content...');
    this.sortSelect = page.locator('button[role="combobox"]').first();
    this.selectAllCheckbox = page.locator('table thead button[role="checkbox"]').first();
    this.bulkBar = page.getByText(/\d+ selected/);
    this.bulkApproveButton = page.getByRole('button', { name: 'Approve All' });
    this.bulkRejectButton = page.getByRole('button', { name: 'Reject All' });
    this.bulkDeleteButton = page.getByRole('button', { name: 'Delete All' });
    this.reviewDetailDialog = dialog(page, 'Review Detail');
    this.detailApproveButton = this.reviewDetailDialog.getByRole('button', { name: 'Approve' });
    this.detailRejectButton = this.reviewDetailDialog.getByRole('button', { name: 'Reject' });
    this.detailRejectReasonTextarea = page.getByPlaceholder('Enter rejection reason (required)...');
    this.deleteConfirmDialog = dialog(page, 'Delete Review');
    this.confirmDeleteButton = this.deleteConfirmDialog.getByRole('button', { name: 'Delete' });
    this.reportTotalCard = statCard(page, 'Total Reports');
    this.reportPendingCard = statCard(page, 'Pending');
    this.reportDetailDialog = page
      .getByRole('dialog')
      .filter({ hasText: /Report (Detail|Information)/ });
    this.reportAdminNoteTextarea = page.getByPlaceholder('Add internal resolution notes...');
    this.reportResolveButton = this.reportDetailDialog.getByRole('button', { name: 'Resolve' });
    this.reportRejectButton = this.reportDetailDialog.getByRole('button', { name: 'Reject' });
    this.rowsPerPageSelect = page.getByLabel('Rows per page');
    this.nextPageButton = page.getByRole('button', { name: 'Next page' });
    this.prevPageButton = page.getByRole('button', { name: 'Previous page' });
  }

  async goto(query = '') {
    await this.page.goto(`/admin/reviews${query}`);
    await this.page.waitForLoadState('networkidle');
  }
}

export class ContentModerationPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly totalCard: Locator;
  readonly activeCard: Locator;
  readonly inactiveCard: Locator;
  readonly table: Locator;
  readonly searchInput: Locator;
  readonly sortSelect: Locator;
  readonly selectAllCheckbox: Locator;
  readonly bulkDeactivateButton: Locator;
  readonly bulkActivateButton: Locator;
  readonly detailDialog: Locator;
  readonly detailDeactivateButton: Locator;
  readonly detailReactivateButton: Locator;
  readonly reasonTextarea: Locator;
  readonly moderateDialog: Locator;
  readonly confirmDeactivateButton: Locator;
  readonly confirmActivateButton: Locator;
  readonly rowsPerPageSelect: Locator;
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Product Content Moderation' });
    this.subtitle = page.getByText('Review and moderate product content');
    this.totalCard = statCard(page, 'Total Products');
    this.activeCard = statCard(page, 'Active');
    this.inactiveCard = statCard(page, 'Inactive');
    this.table = page.locator('table');
    this.searchInput = page.getByPlaceholder('Search products by name or shop...');
    this.sortSelect = page.locator('button[role="combobox"]').first();
    this.selectAllCheckbox = page.locator('table thead button[role="checkbox"]').first();
    this.bulkDeactivateButton = page.getByRole('button', { name: 'Deactivate All' });
    this.bulkActivateButton = page.getByRole('button', { name: 'Activate All', exact: true });
    this.detailDialog = dialog(page, 'Product Information');
    this.detailDeactivateButton = this.detailDialog.getByRole('button', { name: 'Deactivate' });
    this.detailReactivateButton = this.detailDialog.getByRole('button', { name: 'Reactivate' });
    this.reasonTextarea = page.getByPlaceholder(
      'Enter deactivation reason (required, max 500 characters)...',
    );
    this.moderateDialog = page
      .getByRole('dialog')
      .filter({ hasText: /Deactivate Product|Reactivate Product/ });
    this.confirmDeactivateButton = this.moderateDialog.getByRole('button', { name: 'Deactivate' });
    this.confirmActivateButton = this.moderateDialog.getByRole('button', { name: 'Reactivate' });
    this.rowsPerPageSelect = page.getByLabel('Rows per page');
    this.nextPageButton = page.getByRole('button', { name: 'Next page' });
    this.prevPageButton = page.getByRole('button', { name: 'Previous page' });
  }

  async goto(query = '') {
    await this.page.goto(`/admin/content${query}`);
    await this.page.waitForLoadState('networkidle');
  }
}

export class MerchantManagementPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly totalCard: Locator;
  readonly pendingCard: Locator;
  readonly approvedCard: Locator;
  readonly rejectedCard: Locator;
  readonly table: Locator;
  readonly searchInput: Locator;
  readonly sortSelect: Locator;
  readonly viewDetailsButton: Locator;
  readonly detailDialog: Locator;
  readonly approveButton: Locator;
  readonly rejectButton: Locator;
  readonly rejectReasonTextarea: Locator;
  readonly approveConfirmDialog: Locator;
  readonly rejectConfirmButton: Locator;
  readonly rowsPerPageSelect: Locator;
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'Merchant Management' });
    this.subtitle = page.getByText('Review business licenses and manage merchant registrations');
    this.totalCard = statCard(page, 'Total Merchants');
    this.pendingCard = statCard(page, 'Pending');
    this.approvedCard = statCard(page, 'Approved');
    this.rejectedCard = statCard(page, 'Rejected');
    this.table = page.locator('table');
    this.searchInput = page.getByPlaceholder('Search merchants by name or email...');
    this.sortSelect = page.locator('button[role="combobox"]').first();
    this.viewDetailsButton = page.getByRole('button', { name: 'View merchant details' }).first();
    this.detailDialog = page.getByRole('dialog');
    this.approveButton = page.getByRole('button', { name: 'Approve' }).first();
    this.rejectButton = page.getByRole('button', { name: 'Reject' }).first();
    this.rejectReasonTextarea = page.getByPlaceholder(
      'Enter rejection reason (required, max 500 characters)...',
    );
    this.approveConfirmDialog = dialog(page, 'Approve Merchant');
    this.rejectConfirmButton = this.approveConfirmDialog.getByRole('button', { name: 'Approve' });
    this.rowsPerPageSelect = page.getByLabel('Rows per page');
    this.nextPageButton = page.getByRole('button', { name: 'Next page' });
    this.prevPageButton = page.getByRole('button', { name: 'Previous page' });
  }

  async goto(query = '') {
    await this.page.goto(`/admin/merchants${query}`);
    await this.page.waitForLoadState('networkidle');
  }
}

export class UserManagementPage {
  readonly page: Page;
  readonly heading: Locator;
  readonly subtitle: Locator;
  readonly totalCard: Locator;
  readonly activeCard: Locator;
  readonly inactiveCard: Locator;
  readonly adminCard: Locator;
  readonly table: Locator;
  readonly searchInput: Locator;
  readonly sortSelect: Locator;
  readonly viewDetailsButton: Locator;
  readonly detailDialog: Locator;
  readonly deactivateReasonTextarea: Locator;
  readonly deactivateButton: Locator;
  readonly deactivateConfirmDialog: Locator;
  readonly reactivateConfirmDialog: Locator;
  readonly reactivateButton: Locator;
  readonly rowsPerPageSelect: Locator;
  readonly nextPageButton: Locator;
  readonly prevPageButton: Locator;

  constructor(page: Page) {
    this.page = page;
    this.heading = page.getByRole('heading', { name: 'User Management' });
    this.subtitle = page.getByText('Manage user accounts, activate or deactivate users');
    this.totalCard = statCard(page, 'Total Users');
    this.activeCard = statCard(page, 'Active');
    this.inactiveCard = statCard(page, 'Inactive');
    this.adminCard = statCard(page, 'Admin');
    this.table = page.locator('table');
    this.searchInput = page.getByPlaceholder('Search users by name or email...');
    this.sortSelect = page.locator('button[role="combobox"]').first();
    this.viewDetailsButton = this.table.locator('tbody tr').first().getByRole('button').first();
    this.detailDialog = dialog(page, 'User Detail');
    this.deactivateReasonTextarea = page.getByPlaceholder(
      'Enter reason for deactivation (required)...',
    );
    this.deactivateConfirmDialog = dialog(page, 'Deactivate User');
    this.deactivateButton = this.deactivateConfirmDialog.getByRole('button', {
      name: 'Deactivate',
    });
    this.reactivateConfirmDialog = dialog(page, 'Reactivate User');
    this.reactivateButton = this.reactivateConfirmDialog.getByRole('button', {
      name: 'Reactivate',
    });
    this.rowsPerPageSelect = page.getByLabel('Rows per page');
    this.nextPageButton = page.getByRole('button', { name: 'Next page' });
    this.prevPageButton = page.getByRole('button', { name: 'Previous page' });
  }

  async goto(query = '') {
    await this.page.goto(`/admin/users${query}`);
    await this.page.waitForLoadState('networkidle');
  }
}
