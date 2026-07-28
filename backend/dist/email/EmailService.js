import nodemailer from 'nodemailer';
export class NoopEmailService {
    async send() { }
}
export class SmtpEmailService {
    from;
    transport;
    constructor(config) {
        if (!config.user || !config.password)
            throw new Error('Email user and password are required to send order emails.');
        this.from = config.from ?? config.user;
        this.transport = nodemailer.createTransport({
            host: config.host ?? 'smtp.gmail.com',
            port: config.port ?? 587,
            secure: config.secure ?? false,
            auth: { user: config.user, pass: config.password },
        });
    }
    async send(message) {
        await this.transport.sendMail({ from: this.from, to: message.to, subject: message.subject, text: message.text });
    }
}
