const nodemailer = require("nodemailer"); // Import nodemailer for sending emails

const functions = {
  book_Room: async ({ name, email, roomPreferences }) => {
    try {
      // Example: Process room booking based on client preferences
      const bookingDetails = {
        name,
        email,
        roomPreferences
        // Add more booking details as needed
      };

      // Example: Save booking details to a database or backend
      const bookingResponse = await axios.post("https://example.com/bookings", bookingDetails);

      // Example: Send booking confirmation email
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: 'your-email@gmail.com',
          pass: 'your-email-password'
        }
      });

      const mailOptions = {
        from: 'your-email@gmail.com',
        to: email,
        subject: 'Booking Confirmation',
        text: `Dear ${name},\n\nYour room booking has been confirmed.\n\nDetails:\n${roomPreferences}\n\nThank you for booking with us!`
      };

      const emailResponse = await transporter.sendMail(mailOptions);
      console.log("Email sent:", emailResponse);

      return { message: "Booking successful! Booking confirmation email sent." };
    } catch (error) {
      console.error("Error booking room:", error);
      return { error: "Failed to book room" };
    }
  }
};
