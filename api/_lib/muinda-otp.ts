const getConfig = () => ({
  apiKey: process.env["MUINDA_API_KEY"] || '',
  baseUrl: process.env["MUINDA_API_BASE_URL"] || 'https://api.muindatech.com',
  template: process.env["MUINDA_OTP_TEMPLATE"] || 'muinda_login_fr',
  language: process.env["MUINDA_OTP_LANGUAGE"] || 'fr',
});

function toE164(countryCode: string, phone: string): string {
  const digits = phone.replace(/[^0-9]/g, '').replace(/^0+/, '');
  return '+' + countryCode.replace(/^\+/, '') + digits;
}

async function request(method: string, path: string, payload: any): Promise<any> {
  const config = getConfig();
  if (!config.apiKey) {
    console.error('Muinda OTP API key not configured');
    return { success: false, status: 0, error: 'OTP service not configured' };
  }

  try {
    const resp = await fetch(config.baseUrl + path, {
      method,
      headers: {
        'Authorization': 'Bearer ' + config.apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await resp.json().catch(() => ({}));

    if (resp.ok) {
      return { success: true, status: resp.status, data };
    }

    return {
      success: false,
      status: resp.status,
      error: data.error || `HTTP ${resp.status}`,
      reason: data.reason || null,
      data,
    };
  } catch (err: any) {
    console.error('Muinda OTP fetch error:', err.message);
    return { success: false, status: 0, error: err.message };
  }
}

export async function sendOtp(countryCode: string, phone: string) {
  const config = getConfig();
  return request('POST', '/api/v1/otp/send', {
    to: toE164(countryCode, phone),
    templateName: config.template,
    language: config.language,
  });
}

export async function verifyOtp(countryCode: string, phone: string, code: string) {
  return request('POST', '/api/v1/otp/verify', {
    to: toE164(countryCode, phone),
    code,
  });
}
