describe('Fitur Penghapusan Data', () => {
  const email = `pkpl.delete.${Date.now()}@example.com`;
  let token, courseId, taskId;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  before(() => {
    cy.request('POST', '/api/auth/register', {
      name: 'Tester Delete', email, password: 'Testing123!'
    }).then((res) => {
      token = res.body.token;
      return cy.request({
        method: 'POST', url: '/api/courses', headers: auth(),
        body: { name: 'PKPL Delete' }
      });
    }).then((res) => {
      courseId = res.body.id;
      return cy.request({
        method: 'POST', url: '/api/tasks', headers: auth(),
        body: {
          title: 'Tugas Hapus', courseId,
          deadline: new Date(Date.now() + 7 * 86400000).toISOString()
        }
      });
    }).then((res) => { taskId = res.body.id; });
  });

  it('TC023 - Menolak penghapusan tugas yang tidak tersedia', () => {
    cy.request({
      method: 'DELETE', url: '/api/tasks/t_tidak_ada', headers: auth(),
      failOnStatusCode: false
    }).then((res) => {
      expect(res.status).to.eq(404);
      expect(res.body.error).to.contain('Tugas tidak ditemukan');
    });
  });

  it('TC024 - Menghapus tugas valid', () => {
    cy.request({ method: 'DELETE', url: `/api/tasks/${taskId}`, headers: auth() })
      .then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.message).to.contain('berhasil dihapus');
      });
  });

  it('TC025 - Menghapus mata kuliah valid', () => {
    cy.request({ method: 'DELETE', url: `/api/courses/${courseId}`, headers: auth() })
      .then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body.message).to.contain('berhasil dihapus');
      });
  });
});
