import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD
    }
});

interface VerificationEmailParams {
    email: string,
    username: string,
    token: string
}

export const sendVerificationEmail = async({email, username, token}: VerificationEmailParams) => {

    const frontendUrl = process.env.FRONTEND_URL;

    if(!frontendUrl){
        throw new Error("FRONTEND_URL is not configured");
    }

    const verificationUrl = `${frontendUrl}/verify-email?token=${encodeURIComponent(token)}`;

    await transporter.sendMail({
        from: process.env.EMAIL_FROM,
        to: email,
        subject: "Verify your email address",
         html: `
        <!DOCTYPE html>
        <html>
            <body>
            <h2>Welcome to Twitter Clone, ${username}!</h2>

            <p>
                Thanks for creating your account.
                Please verify your email address by clicking the button below.
            </p>

            <p>
                <a
                href="${verificationUrl}"
                style="
                    display: inline-block;
                    padding: 12px 20px;
                    background-color: #1d9bf0;
                    color: white;
                    text-decoration: none;
                    border-radius: 6px;
                "
                >
                Verify Email
                </a>
            </p>

            <p>This link will expire in 15 minutes.</p>

            <p>
                If you didn't create this account, you can safely ignore this email.
            </p>
            </body>
        </html>`,
    })
}