describe('Dashboard, Pencarian, Filter & Jadwal', () => {
  let source;

  before(() => {
    cy.request('/js/app.js').then((res) => { source = res.body; });
  });

  it('TC028 - Memverifikasi ringkasan dashboard', () => {
    expect(source).to.contain('function renderDashboardView');
    expect(source).to.contain('stat-total-tasks');
    expect(source).to.contain('stat-urgent-tasks');
    expect(source).to.contain('stat-completed-tasks');
    expect(source).to.contain('stat-total-courses');
  });

  it('TC029 - Memverifikasi cakupan pencarian global', () => {
    ['titleMatch','descMatch','courseMatch','codeMatch',
     'typeMatch','priorityMatch','statusMatch'].forEach((key) => {
      expect(source).to.contain(key);
    });
  });

  it('TC030 - Memverifikasi filter Kanban', () => {
    expect(source).to.contain("document.getElementById('filter-course')");
    expect(source).to.contain("document.getElementById('filter-priority')");
    expect(source).to.contain("document.getElementById('filter-type')");
    expect(source).to.contain('getFilteredTasks');
  });

  it('TC031 - Memverifikasi renderer jadwal mingguan', () => {
    expect(source).to.contain('renderScheduleView');
    expect(source).to.contain('course.day');
    expect(source).to.contain('course.time');
    expect(source).to.contain('course.room');
  });
});
