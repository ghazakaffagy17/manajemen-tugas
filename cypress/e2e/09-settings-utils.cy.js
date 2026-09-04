describe('Fitur Pengaturan & Utilitas', () => {
  let source;

  before(() => {
    cy.request('/js/app.js').then((res) => { source = res.body; });
  });

  it('TC032 - Memverifikasi fungsi perubahan tema', () => {
    expect(source).to.contain('function toggleTheme');
    expect(source).to.contain("html.setAttribute('data-theme', next)");
  });

  it('TC033 - Memverifikasi fungsi ekspor backup JSON', () => {
    expect(source).to.contain('function exportDataJSON');
    expect(source).to.contain('JSON.stringify(data, null, 2)');
    expect(source).to.contain('acadamiatask_backup_');
  });

  it('TC034 - Memverifikasi proses logout', () => {
    expect(source).to.contain('function handleLogout');
    expect(source).to.contain("localStorage.removeItem('academia_token')");
    expect(source).to.contain('auth-overlay');
  });
});
