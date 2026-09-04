describe('Fitur Detail & Sub-Tugas', () => {
  const email = `pkpl.subtask.${Date.now()}@example.com`;
  let token, courseId, taskId, subtaskId;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  before(() => {
    cy.request('POST', '/api/auth/register', {
      name: 'Tester Subtask', email, password: 'Testing123!'
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
          title: 'Tugas Dengan Subtask', courseId,
          deadline: new Date(Date.now() + 7 * 86400000).toISOString()
        }
      });
    }).then((res) => { taskId = res.body.id; });
  });

  it('TC020 - Menambahkan sub-tugas', () => {
    cy.request({
      method: 'PUT', url: `/api/tasks/${taskId}`, headers: auth(),
      body: { subtasks: [{ title: 'Membuat test case', completed: false }] }
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.subtasks).to.have.length(1);
      subtaskId = res.body.subtasks[0].id;
    });
  });

  it('TC021 - Toggle checklist sub-tugas', () => {
    cy.request({
      method: 'PATCH',
      url: `/api/tasks/${taskId}/subtask/${subtaskId}`,
      headers: auth()
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.subtasks[0].completed).to.eq(true);
    });
  });

  it('TC022 - Menolak sub-tugas yang tidak tersedia', () => {
    cy.request({
      method: 'PATCH',
      url: `/api/tasks/${taskId}/subtask/st_tidak_ada`,
      headers: auth(), failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(404);
      expect(res.body.error).to.contain('Sub-tugas tidak ditemukan');
    });
  });
});
