import { router } from './trpc';
import { actorRouter } from './routers/actor';

export const appRouter = router({
  actor: actorRouter,
});

export type AppRouter = typeof appRouter;
