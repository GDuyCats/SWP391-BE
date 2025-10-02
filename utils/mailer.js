import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD
    }
})

class Mail {
    constructor() {
        this.mailOptions = {
            from: {
                name: '2NDEV',
                address: process.env.EMAIL
            }
        }
    }

    /**
     * @param {string} name 
    */

    setCompanyName(name) {
        this.mailOptions.from.name = name;
    }


    /**
      * @param {string} email
    */

    setSenderEmail(email) {
        this.mailOptions.from.address = email;
    }

    /**
    * @param {string} receiver
    */

    setTo(receiver) {
        /** 
         * @type {string} 
        */
        let receivers = this.mailOptions.to || []
        receivers.push(receiver)
        this.mailOptions.to = receivers;
    }

    setCC(cc){
        let ccs = this.mailOptions.cc || []
        ccs.push(cc);
        this.mailOptions.cc = ccs
    }

    setBCC(bcc){
        let bccs = this.mailOptions.bcc || []
        bccs.push(bcc);
        this.mailOptions.bcc = bccs
    }

    /**
      * @param {string} subject
    */

    setSubject(subject) {
        this.mailOptions.subject = subject;
    }

    /**
      * @param {string} text
    */

    setText(text) {
        /**
         * @type {string}
         */
        this.mailOptions.text = text;
    }
    /**
     * @param {string} html
     */

    setHTML(html) {
        /**
         * @type {string}
         */
        this.mailOptions.html = html
    }

    /**
     * @return {void}
     */
    async send() {
        transporter.sendMail(this.mailOptions, (error, info) => {
            if (error) {
                console.log(error)
                // return res.status(500).send('Error sending email');
            } else {
                console.log('Email Send : ' + info.response)
                res.send('Email sent: ' + info.response);
            }
        })
    }
}
export default Mail;