import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

async function indlaes() {
  return import('../netlify/functions/lib/pa-otp.js?v=' + Math.random());
}

describe('pa-otp', () => {
  const oprindeligLogin = process.env.PA_OTP_LOGIN_URL;
  const oprindeligVerify = process.env.PA_OTP_VERIFY_URL;

  beforeEach(() => {
    process.env.PA_OTP_LOGIN_URL = 'https://pa.example/login-flow';
    process.env.PA_OTP_VERIFY_URL = 'https://pa.example/verify-flow';
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    if (oprindeligLogin === undefined) delete process.env.PA_OTP_LOGIN_URL;
    else process.env.PA_OTP_LOGIN_URL = oprindeligLogin;
    if (oprindeligVerify === undefined) delete process.env.PA_OTP_VERIFY_URL;
    else process.env.PA_OTP_VERIFY_URL = oprindeligVerify;
    vi.unstubAllGlobals();
  });

  it('anmodOmKode kalder PA_OTP_LOGIN_URL med mailen og returnerer flowets svar', async () => {
    fetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ message: 'Kode sendt.' })
    });
    const { anmodOmKode } = await indlaes();

    const svar = await anmodOmKode('jesper@stark.dk');

    expect(fetch).toHaveBeenCalledWith(
      'https://pa.example/login-flow',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ mail: 'jesper@stark.dk' })
      })
    );
    expect(svar).toEqual({ ok: true, status: 200, data: { message: 'Kode sendt.' } });
  });

  it('anmodOmKode returnerer 404 uændret, når flowet ikke finder mailen', async () => {
    fetch.mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });
    const { anmodOmKode } = await indlaes();

    const svar = await anmodOmKode('ukendt@stark.dk');

    expect(svar.ok).toBe(false);
    expect(svar.status).toBe(404);
  });

  it('verificerKode kalder PA_OTP_VERIFY_URL med mail og otp', async () => {
    fetch.mockResolvedValueOnce({ ok: true, status: 200, json: async () => ({}) });
    const { verificerKode } = await indlaes();

    await verificerKode('jesper@stark.dk', '123456');

    expect(fetch).toHaveBeenCalledWith(
      'https://pa.example/verify-flow',
      expect.objectContaining({ body: JSON.stringify({ mail: 'jesper@stark.dk', otp: '123456' }) })
    );
  });

  it('kaster PaOtpFejl med statusCode 500, hvis env var mangler', async () => {
    delete process.env.PA_OTP_LOGIN_URL;
    const { anmodOmKode, PaOtpFejl } = await indlaes();

    await expect(anmodOmKode('jesper@stark.dk')).rejects.toBeInstanceOf(PaOtpFejl);
    await expect(anmodOmKode('jesper@stark.dk')).rejects.toMatchObject({ statusCode: 500 });
  });

  it('kaster PaOtpFejl med statusCode 502, hvis flowet timer ud', async () => {
    fetch.mockImplementationOnce(() => {
      const err = new Error('aborted');
      err.name = 'AbortError';
      return Promise.reject(err);
    });
    const { anmodOmKode, PaOtpFejl } = await indlaes();

    let fanget;
    try {
      await anmodOmKode('jesper@stark.dk');
    } catch (e) {
      fanget = e;
    }
    expect(fanget).toBeInstanceOf(PaOtpFejl);
    expect(fanget.statusCode).toBe(502);
  });
});
