describe('Fitur Status & Kanban', () => {
  const email = `pkpl.status.${Date.now()}@example.com`;
  let token, courseId, taskId;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  before(() => {
    cy.request('POST', '/api/auth/register', {
      name: 'Tester Status', email, password: 'Testing123!'
    }).then((res) => {
      token = res.body.token;
      return cy.request({
        method: 'POST', url: '/api/courses', headers: auth(),
        body: { name: 'PKPL' }
      });
    }).then((res) => {
      courseId = res.body.id;
      return cy.request({
        method: 'POST', url: '/api/tasks', headers: auth(),
        body: {
          title: 'Tugas Status', courseId,
          deadline: new Date(Date.now() + 7 * 86400000).toISOString()
        }
      });
    }).then((res) => { taskId = res.body.id; });
  });

  it('TC018 - Menolak status yang tidak valid', () => {
    cy.request({
      method: 'PATCH', url: `/api/tasks/${taskId}/status`, headers: auth(),
      failOnStatusCode: false, body: { status: 'Tidak Valid' }
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.error).to.eq('Status tidak valid.');
    });
  });

  it('TC019 - Mengubah status menjadi Sedang Dikerjakan', () => {
    cy.request({
      method: 'PATCH', url: `/api/tasks/${taskId}/status`, headers: auth(),
      body: { status: 'Sedang Dikerjakan' }
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.status).to.eq('Sedang Dikerjakan');
    });
  });
});
