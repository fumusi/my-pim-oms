import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-github2';

export interface GithubProfile {
  email: string;
  firstName: string | null;
  lastName: string | null;
  avatarUrl: string | null;
}

@Injectable()
export class GithubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(config: ConfigService) {
    super({
      clientID: config.getOrThrow<string>('GITHUB_CLIENT_ID'),
      clientSecret: config.getOrThrow<string>('GITHUB_CLIENT_SECRET'),
      callbackURL: config.getOrThrow<string>('GITHUB_CALLBACK_URL'),
      scope: ['user:email'],
    });
  }

  validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: (err: Error | null, user?: GithubProfile) => void,
  ): void {
    const email = profile.emails?.[0]?.value ?? null;
    if (!email)
      return done(
        new Error(
          'No email on this GitHub account — make sure your email is public',
        ),
      );

    const [firstName = null, ...rest] = (profile.displayName ?? '').split(' ');
    const lastName = rest.length ? rest.join(' ') : null;

    done(null, {
      email,
      firstName: firstName || null,
      lastName,
      avatarUrl: profile.photos?.[0]?.value ?? null,
    });
  }
}
