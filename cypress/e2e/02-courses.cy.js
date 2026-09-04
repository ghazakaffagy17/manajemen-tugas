describe('Fitur Mata Kuliah', () => {
  const email = `pkpl.course.${Date.now()}@example.com`;
  const password = 'Testing123!';
  let token, courseId;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  before(() => {
    cy.request('POST', '/api/auth/register', {
      name: 'Tester Course', email, password
    }).then((res) => { token = res.body.token; });
  });

  it('TC008 - Menambahkan mata kuliah dengan data lengkap valid', () => {
    const data = {
      name: 'Penjaminan Kualitas Perangkat Lunak', code: 'PKPL-05',
      lecturer: 'Ilyas Nuryasin', room: 'GKB 4.401', credits: 3,
      day: 'Selasa', time: '13:00 - 15:30', color: '#3355aa'
    };
    cy.request({ method: 'POST', url: '/api/courses', headers: auth(), body: data })
      .then((res) => {
        expect(res.status).to.eq(201);
        expect(res.body.room).to.eq(data.room);
        expect(res.body.time).to.eq(data.time);
        expect(res.body.color).to.eq(data.color);
        courseId = res.body.id;
      });
  });

  it('TC009 - Menolak nama mata kuliah dengan simbol terlarang', () => {
    cy.request({
      method: 'POST', url: '/api/courses', headers: auth(), failOnStatusCode: false,
      body: { name: 'Basis Data <Test>', credits: 3 }
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.error).to.contain('simbol khusus');
    });
  });

  it('TC010 - Menolak mata kuliah tanpa nama', () => {
    cy.request({
      method: 'POST', url: '/api/courses', headers: auth(), failOnStatusCode: false,
      body: { code: 'NO-NAME' }
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.error).to.contain('wajib diisi');
    });
  });

  it('TC011 - Mengedit data mata kuliah', () => {
    cy.request({
      method: 'PUT', url: `/api/courses/${courseId}`, headers: auth(),
      body: {
        name: 'PKPL Lanjut', code: 'PKPL-06', lecturer: 'Ilyas Nuryasin',
        room: 'GKB 4.402', credits: 4, day: 'Kamis',
        time: '10:00 - 12:30', color: '#224488'
      }
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.name).to.eq('PKPL Lanjut');
      expect(res.body.credits).to.eq(4);
    });
  });

  it('TC012 - Mengedit mata kuliah yang tidak tersedia', () => {
    cy.request({
      method: 'PUT', url: '/api/courses/c_tidak_ada', headers: auth(),
      failOnStatusCode: false, body: { name: 'Tidak Ada' }
    }).then((res) => {
      expect(res.status).to.eq(404);
      expect(res.body.error).to.contain('tidak ditemukan');
    });
  });

  it('TC026 - Memverifikasi payload frontend saveCourse', () => {
    cy.request('/js/app.js').then((res) => {
      const saveCourse = res.body.match(/async function saveCourse[\s\S]*?\n}\n/)[0];
      expect(saveCourse).to.contain('time:');
      expect(saveCourse).to.contain('room:');
      expect(saveCourse).to.contain('color:');
    });
  });
});
