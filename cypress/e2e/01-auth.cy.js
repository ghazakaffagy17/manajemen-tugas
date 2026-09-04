describe('Fitur Autentikasi', () => {
  const email = `pkpl.auth.${Date.now()}@example.com`;
  const password = 'Testing123!';
  let token;

  it('TC001 - Registrasi akun dengan data valid', () => {
    cy.request('POST', '/api/auth/register', {
      name: 'Mahasiswa PKPL', email, password,
      university: 'Universitas Muhammadiyah Malang',
      major: 'Teknik Informatika'
    }).then((res) => {
      expect(res.status).to.eq(201);
      expect(res.body).to.have.property('token');
      token = res.body.token;
    });
  });

  it('TC002 - Registrasi dengan email yang sudah terdaftar', () => {
    cy.request({
      method: 'POST', url: '/api/auth/register', failOnStatusCode: false,
      body: { name: 'Mahasiswa PKPL', email, password }
    }).then((res) => {
      expect(res.status).to.eq(400);
      expect(res.body.error).to.contain('Email sudah terdaftar');
    });
  });

  it('TC003 - Login dengan password tidak valid', () => {
    cy.request({
      method: 'POST', url: '/api/auth/login', failOnStatusCode: false,
      body: { email, password: 'Salah123' }
    }).then((res) => {
      expect(res.status).to.eq(401);
      expect(res.body.error).to.contain('Email atau password salah');
    });
  });

  it('TC004 - Login dengan kredensial valid', () => {
    cy.request('POST', '/api/auth/login', { email, password }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body).to.have.property('token');
      token = res.body.token;
    });
  });

  it('TC005 - Mengambil profil pengguna terautentikasi', () => {
    cy.request({
      method: 'GET', url: '/api/auth/me',
      headers: { Authorization: `Bearer ${token}` }
    }).then((res) => {
      expect(res.status).to.eq(200);
      expect(res.body.user.email).to.eq(email);
    });
  });

  it('TC006 - Mengakses profil tanpa token', () => {
    cy.request({ method: 'GET', url: '/api/auth/me', failOnStatusCode: false })
      .then((res) => {
        expect(res.status).to.eq(401);
        expect(res.body.error).to.contain('Token tidak ditemukan');
      });
  });

  it('TC007 - Mengakses profil dengan token tidak valid', () => {
    cy.request({
      method: 'GET', url: '/api/auth/me', failOnStatusCode: false,
      headers: { Authorization: 'Bearer token-tidak-valid' }
    }).then((res) => {
      expect(res.status).to.eq(403);
      expect(res.body.error).to.contain('Token tidak valid');
    });
  });
});
