import jswt from 'jsonwebtoken';
import { UserModel } from '../postgres/postgres.js';

const flash = (res, name) =>
  res.cookie(name, '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 10_000,
    path: '/',
  });

const verifyMailController = async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Missing token');

  try {
    const payload = jswt.verify(token, process.env.JWT_SECRET_VERIFYEMAIL);
    const user = await UserModel.findOne({ where: { id: payload.id } });
    if (!user) return res.status(404).send('User not found');

    if (user.isVerified) {
      // ✅ đã verify trước đó
      flash(res, 'alreadyVerified');
      return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }

    await user.update({ isVerified: true });
    await user.reload();

    // ✅ verify thành công lần đầu
    flash(res, 'justVerified');
    return res.redirect(`${process.env.FRONTEND_URL}/login`);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      flash(res, 'verifyExpired');
      return res.redirect(`${process.env.FRONTEND_URL}/login`);
    }
    flash(res, 'verifyInvalid');
    return res.redirect(`${process.env.FRONTEND_URL}/login`);
  }
};

export { verifyMailController };
