import React, { useMemo } from 'react';

const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function makeCaptcha(length = 5) {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CHARS[Math.floor(Math.random() * CHARS.length)];
  }
  return out;
}

export default function Captcha({ captchaText, inputValue, setInputValue, onRefresh }) {
  const captcha = captchaText || makeCaptcha();
  const letters = useMemo(() => captcha.split(''), [captcha]);

  return (
    <div className="captcha-wrap">
      <div className="captcha-box" aria-label="captcha">
        {letters.map((ch, idx) => (
          <span
            key={`${ch}-${idx}`}
            className="captcha-char"
            style={{ transform: `rotate(${(idx % 2 === 0 ? -1 : 1) * (idx + 2)}deg)` }}
          >
            {ch}
          </span>
        ))}
      </div>
      <button type="button" className="captcha-refresh" onClick={onRefresh}>
        Refresh
      </button>
      <input
        type="text"
        className="auth-input"
        placeholder="Enter CAPTCHA"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        required
      />
    </div>
  );
}

export { makeCaptcha };
