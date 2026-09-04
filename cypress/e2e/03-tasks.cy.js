describe('Fitur Manajemen Tugas', () => {
  const email = `pkpl.task.${Date.now()}@example.com`;
  let token, courseId, taskId;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  before(() => {
    cy.request('POST', '/api/auth/register', {
      name: 'Tester Task', email, password: 'Testing123!'
    }).then((res) => {
      token = res.body.token;
      return cy.request({
        method: 'POST', url: '/api/courses', headers: auth(),
        body: { name: 'PKPL', code: 'PKPL-05', credits: 3 }
      });
    }).then((res) => { courseId = res.body.id; });
  });

  it('TC013 - Menambahkan tugas dengan data valid', () => {
    const deadline = new Date(Date.now() + 10 * 86400000).toISOString();
    cy.request({
      method: 'POST', url: '/api/tasks', headers: auth(),
      body: {
        title: 'Laporan Automated Testing', courseId,
        description: 'Dokumentasi Modul 5 PKPL', type: 'Praktikum',
        status: 'Belum Dikerjakan', deadline
      }
    }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body.priority).to.eq('Rendah');
      taskId = res.body.id;
    });
  });

  it('TC014 - Menolak judul tugas dengan simbol terlarang', () => {
    cy.request({
      method: 'POST', url: '/api/tasks', headers: auth(), failOnStatusCode: false,
      body: {
        title: 'Tugas <script>', courseId,
        deadline: new Date(Date.now() + 5 * 86400000).toISOString()
      }
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.error).to.contain('simbol khusus');
    });
  });

  it('TC015 - Menolak tugas tanpa deadline', () => {
    cy.request({
      method: 'POST', url: '/api/tasks', headers: auth(), failOnStatusCode: false,
      body: { title: 'Tugas Tanpa Deadline', courseId }
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.error).to.contain('Deadline wajib diisi');
    });
  });

  it('TC016 - Mengambil daftar tugas pengguna', () => {
    cy.request({ method: 'GET', url: '/api/tasks', headers: auth() })
      .then((res) => {
        expect(res.status).to.eq(200);
        expect(res.body[0]).to.have.keys([
          'id','userId','courseId','title','description','type','priority','status',
          'deadline','link','subtasks','createdAt','courseName','courseCode','courseColor'
        ]);
      });
  });

  it('TC017 - Mengedit tugas dan menghitung ulang prioritas', () => {
    const deadline = new Date(Date.now() + 12 * 3600000).toISOString();
    cy.request({
      method: 'PUT', url: `/api/tasks/${taskId}`, headers: auth(),
      body: { title: 'Laporan PKPL Otomasi', deadline }
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.priority).to.eq('Tinggi');
    });
  });
});
