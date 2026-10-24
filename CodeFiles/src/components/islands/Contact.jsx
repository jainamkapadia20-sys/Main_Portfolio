import { useRef, useState } from 'react';
import LaserFlow from '../bits/LaserFlow';
import { palettes, useTheme } from '@/lib/theme';

// The close of every page: a red beam lands on the one field. The field writes an email (there is no form backend),
// so the message opens in the visitor's mail app, ready to send.
export default function Contact({ email, heading }) {
  const theme = useTheme();
  const box = useRef(null);
  const [msg, setMsg] = useState('');
  const send = (e) => {
    e.preventDefault();
    const body = encodeURIComponent(msg.trim());
    location.href = `mailto:${email}?subject=${encodeURIComponent('Hello from your portfolio')}${body ? `&body=${body}` : ''}`;
  };
  return (
    <div className="contact-stage">
      <div className="contact-laser" aria-hidden="true">
        <LaserFlow surfaceRef={box} beamPosition={0.5} color={palettes[theme].accent} theme={theme} intensity={1.5} fog={0.25} dust={1.2} speed={1} />
      </div>
      <div className="contact-box" ref={box}>
        <h2 className="contact-h" id="contact-h">{heading}</h2>
        <form className="contact-form" onSubmit={send}>
          <label className="sr-only" htmlFor="contact-msg">Your message</label>
          <input id="contact-msg" type="text" value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Write a message" autoComplete="off" />
          <button type="submit" aria-label="Write the email">
            <svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h9M8.5 4.5 12 8l-3.5 3.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" /></svg>
          </button>
        </form>
        <p className="contact-note">Opens your mail app with the message filled in, sent to {email}.</p>
      </div>
    </div>
  );
}
