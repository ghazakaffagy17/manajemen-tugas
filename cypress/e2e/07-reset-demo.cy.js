describe('Fitur Reset Data Demo', () => {
  const email = `pkpl.reset.${Date.now()}@example.com`;
  let token;
  const auth = () => ({ Authorization: `Bearer ${token}` });

  before(() => {
    cy.request('POST', '/api/auth/register', {
      name: 'Tester Reset', email, password: 'Testing123!'
    }).then((res) => { token = res.body.token; });
  });

  it('TC027 - Reset data harus memuat ulang data contoh', () => {
    cy.request({ method: 'POST', url: '/api/auth/reset-demo', headers: auth() })
      .then((res) => {
        expect(res.status).to.eq(200);
        return cy.request({ method: 'GET', url: '/api/courses', headers: auth() });
      }).then((res) => {
        expect(res.body.length).to.be.greaterThan(0);
      });
  });
});
