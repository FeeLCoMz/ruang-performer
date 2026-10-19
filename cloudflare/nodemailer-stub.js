/**
 * Stand-in for `nodemailer` in the Cloudflare Workers bundle.
 *
 * SMTP (nodemailer) needs raw TCP sockets, which the Workers runtime does not
 * provide. `api/_mailer.js` detects this stub and falls back to an HTTP email
 * provider (Resend / Postmark) configured through environment variables.
 *
 * The esbuild alias is wired in scripts/build-cloudflare.mjs.
 */

function createTransport() {
  return {
    sendMail() {
      return Promise.reject(
        new Error(
          'SMTP is not available on Cloudflare Workers. ' +
            'Set MAIL_PROVIDER=resend (RESEND_API_KEY) or MAIL_PROVIDER=postmark (POSTMARK_SERVER_TOKEN), ' +
            'or send mail from an external service.',
        ),
      );
    },
  };
}

export default { createTransport, __rpStub: true };
export { createTransport };
