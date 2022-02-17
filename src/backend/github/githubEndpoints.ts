import { configuration } from '../utilities/configuration';
import { paths } from '../endpoints/paths';

export const githubEndpoints = {
  authorize: 'https://github.com/login/oauth/authorize',
  token: 'https://github.com/login/oauth/access_token',
  profile: 'https://api.github.com/user',

  redirectUri: `${configuration.baseUri}${paths.oauth.github}`,
};
