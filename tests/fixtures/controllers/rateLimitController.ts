import { Route, Get, Controller } from '@namecheap/tsoa-runtime';
import { RateLimitByUserId, RateLimitByUserIp } from './rateLimitDecorator';
import { userIpRateLimitConfigExpr } from './rateLimitConfigs';

@Route('rateLimit')
export class RateLimitController extends Controller {
  @Get('test')
  @RateLimitByUserId(100, 60)
  public async getRateLimitedResource(): Promise<string> {
    return 'This is a rate-limited resource';
  }

  @Get('expr')
  @RateLimitByUserIp(userIpRateLimitConfigExpr)
  public async getByExpr(): Promise<string> {
    return 'OK';
  }
}
