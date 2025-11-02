import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import authRepository from '../../repositories/AuthRepository.js';
import PointRepository from '../../repositories/PointRepository.js';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: 'https://six-favoritephoto-4team-be-distribute.onrender.com/api/auth/google/callback'
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // 이메일, 구글ID 추출
        const email = profile.emails[0].value;
        const googleId = profile.id;
        const nickname = profile.displayName || email.split('@')[0];
        let user = await authRepository.findByEmail(email);
        if (!user) {
          // 신규 회원가입
          user = await authRepository.create({
            email,
            googleId,
            nickname,
            password: null,
            profileImage: profile.photos?.[0]?.value || null
          });
          // 신규 회원가입 시 포인트 500 지급
          await PointRepository.createUserPoint(user.id, 500, null, 0);
        } else if (!user.googleId) {
          // 기존 회원이지만 googleId가 없으면 업데이트
          await authRepository.update(user.id, { googleId });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

export default passport;
