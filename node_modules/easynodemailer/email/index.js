const nodemailer = require("nodemailer");

async function sendEmail(email, subjectOfEmail, textToBeSentInEmail) {
    var transporter = nodemailer.createTransport({
        service: "Gmail",
        auth: {
            user: 'parthshah1936@gmail.com',
            pass: 'adgzcbqet19',
        },
    });

    transporter.sendMail({
        from: 'smartexamportal@gmail.com',
        to: email,
        subject: subjectOfEmail,
        text: textToBeSentInEmail
    });

    transporter.close();
}
module.exports = {
    sendEmail
}