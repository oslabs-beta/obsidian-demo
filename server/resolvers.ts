import { Pool } from 'https://deno.land/x/postgres/mod.ts';
// import { PoolClient } from 'https://deno.land/x/postgres/client.ts';

let pgPort: number | string | undefined = Deno.env.get('PG_PORT');
if (typeof pgPort === 'string') {
  pgPort = parseInt(pgPort as string);
}

const config = {
  user: Deno.env.get('PG_USER'),
  database: Deno.env.get('PG_DATABASE'),
  password: Deno.env.get('PG_PASSWORD'),
  hostname: Deno.env.get('PG_HOSTNAME'),
  port: pgPort,
};

const POOL_CONNECTIONS = 3; // breaks at 10+ due to ElephantSQL

let pool = new Pool(config, POOL_CONNECTIONS);

const resolvers = {
  Query: {
    movies: async (
      // Changed unused parameters to '_a'; follows TypeScript convention see https://github.com/Microsoft/TypeScript/issues/9458
      _a: string,
      { input }: { input: { genre?: string; order?: string; actor?: string } }
    ) => {
      try {
        const client = await pool.connect();

        const {rows} = await client.queryObject<{id: number, title: string, genre: string, release_dt: string}>({
          text: 'SELECT * FROM obsidian_demo_schema.films;',
          args: [],
        });

        client.release();

        // Rename release_dt key to releaseYear
        let resObj = rows.map((arr) => {
          return { 
            id: arr.id,
            title: arr.title,
            genre: arr.genre,
            releaseYear: arr.release_dt
          };
        });

        if (input) {
          if (input.genre) {
            resObj = resObj.filter((obj: any) => obj.genre === input.genre);
          }
          if (input.order) {
            if (input.order === 'ASC') {
              resObj = resObj.sort(
                (a: any, b: any) => a.releaseYear - b.releaseYear
              );
            } else {
              resObj = resObj.sort(
                (a: any, b: any) => b.releaseYear - a.releaseYear
              );
            }
          }
          if (input.actor) {
            try {
              const client = await pool.connect();

              const {rows} = await client.queryArray<[actor_id: number]>({
                text: `
                  SELECT film_id
                  FROM obsidian_demo_schema.actor_films
                  WHERE actor_id = $1;
                  `,
                args: [input.actor],
              });

              client.release();

              const arrOfIds =  rows.map((arr) => arr[0]);
              resObj = resObj.filter((obj) => arrOfIds.includes(obj.id));
            } catch (err) {
              console.log(err);
            }
          }
        }
        return resObj;
      } catch (err) {
        console.log(err);
        console.log('resetting connection');
        pool.end();
        pool = new Pool(config, POOL_CONNECTIONS);
      }
    },
    actors: async (_a: string, { input }: { input: { film?: string } }) => {
      try {
        const client = await pool.connect();
        
        const {rows} = await client.queryObject<{id: number, first_name: string, last_name: string, nickname: string}>({
          text: 'SELECT * FROM obsidian_demo_schema.actors;',
          args: [],
        })
        
        client.release();
        
        // Map first_name and last_name keys of rows variable to firstName and lastName on resObj
        let resObj = rows.map((arr) => {
          return {
            id: arr.id,
            firstName: arr.first_name,
            lastName: arr.last_name,
            nickname: arr.nickname,
          };
        });

        if (input) {
          if (input.film) {
            try {
              const client = await pool.connect();
                
                const {rows} = await client.queryArray<[film_id: number]>({
                  text: `
                  SELECT actor_id
                  FROM obsidian_demo_schema.actor_films
                  WHERE film_id = $1;
                  `,
                  args: [input.film],
                })

                client.release();

              const arrOfIds = rows.map((arr) => arr[0]);

              resObj = resObj.filter((obj) => arrOfIds.includes(obj.id));
            } catch (err) {
              console.log(err);
              console.log('resetting connection');
              pool.end();
              pool = new Pool(config, POOL_CONNECTIONS);
            }
          }
        }
        return resObj;
      } catch (err) {
        console.log(err);
        console.log('resetting connection');
        pool.end();
        pool = new Pool(config, POOL_CONNECTIONS);
      }
    },
  },
  Movie: {
    actors: async ({ id }: { id: string }) => {
      try {
        const client = await pool.connect();

        const {rows} = await client.queryObject<{id: number, first_name: string, last_name: string, nickname?: string}>({
          text: `
            SELECT a.*
            FROM obsidian_demo_schema.actors AS a
            INNER JOIN obsidian_demo_schema.actor_films AS af
            ON a.id = af.actor_id
            INNER JOIN obsidian_demo_schema.films AS f
            ON f.id =  af.film_id
            WHERE f.id = $1;
            `,
          args: [id],
        })

        client.release();

        // Map first_name and last_name keys to firstName and lastName
        const resObj = rows.map((arr) => {
          return {
            id: arr.id,
            firstName: arr.first_name,
            lastName: arr.last_name,
            nickname: arr.nickname,
          };
        });
        return resObj;
      } catch (err) {
        console.log(err);
        console.log('resetting connection');
        pool.end();
        pool = new Pool(config, POOL_CONNECTIONS);
      }
    },
  },
  Actor: {
    movies: async ({ id }: { id: string }) => {
      try {
        const client = await pool.connect();

        const {rows} = await client.queryObject<{id: number, title: string, genre: string, release_dt: number}>({
          text: `
            SELECT f.*
            FROM obsidian_demo_schema.films AS f
            INNER JOIN obsidian_demo_schema.actor_films AS af
            ON f.id = af.film_id
            INNER JOIN obsidian_demo_schema.actors AS a
            ON a.id =  af.actor_id
            WHERE a.id = $1;
            `,
          args: [id],
        })

        client.release();

        const resObj = rows.map((arr) => {
          return {
            id: arr.id,
            title: arr.title,
            genre: arr.genre,
            releaseYear: arr.release_dt,
          };
        });
        return resObj;
      } catch (err) {
        console.log(err);
        console.log('resetting connection');
        pool.end();
        pool = new Pool(config, POOL_CONNECTIONS);
      }
    },
  },
  ActorOrMovie: {
    __resolveType(obj: any) {
      if (obj.firstName || obj.lastName || obj.nickName || obj.movies) {
        return 'Actor';
      }
      if (obj.title || obj.releaseYear || obj.genre || obj.actors) {
        return 'Movie';
      }
      return null;
    },
  },
  Mutation: {
    addMovie: async (
      _a: string,
      {
        input,
      }: { input: { title: string; releaseYear: number; genre: string } }
    ) => {
      try {
        const client = await pool.connect();

        const {rows} = await client.queryObject<{id: number, title: string, genre: string, release_dt: number}>({
          text: `
            INSERT INTO obsidian_demo_schema.films (title,release_dt, genre)
            VALUES ($1, $2, $3)
            RETURNING *;
            `,
          args: [input.title, input.releaseYear, input.genre],
        })

        client.release();

        const newMovieArr = rows[0];
        const newMovieObj = {
          id: newMovieArr.id,
          title: newMovieArr.title,
          genre: newMovieArr.genre,
          releaseYear: newMovieArr.release_dt,
        };
        return newMovieObj;
      } catch (err) {
        console.log(err);
        console.log('resetting connection');
        pool.end();
        pool = new Pool(config, POOL_CONNECTIONS);
      }
    },

    deleteMovie: async (_a: string, { id }: { id: string }) => {
      try {
        const client = await pool.connect();

        const {rows} = await client.queryObject<{id: number, title: string, genre: string, release_dt: number}>({
          text: `
            DELETE FROM obsidian_demo_schema.films
            WHERE id = $1
            RETURNING *;
            `,
          args: [id],
        })

        client.release();

        const deletedMovieArr = rows[0];
        const deletedMovieObj = {
          id: deletedMovieArr.id,
          title: deletedMovieArr.title,
          genre: deletedMovieArr.genre,
          releaseYear: deletedMovieArr.release_dt,
        };
        return deletedMovieObj;
      } catch (err) {
        console.log(err);
        console.log('resetting connection');
        pool.end();
        pool = new Pool(config, POOL_CONNECTIONS);
      }
    },

    addActor: async (
      _a: string,
      {
        input,
      }: { input: { firstName: string; lastName: string; nickname?: string } }
    ) => {
      try {
        const client = await pool.connect();

        const {rows} = await client.queryObject<{id: number, first_name: string, last_name: string, nickname: string}>({
          text: `
            INSERT INTO obsidian_demo_schema.actors (first_name, last_name, nickname)
            VALUES ($1, $2, $3)
            RETURNING *;
            `,
          args: [input.firstName, input.lastName, input.nickname],
        })

        client.release();

        const newActorArr = rows[0];
        const newActorObj = {
          id: newActorArr.id,
          firstName: newActorArr.first_name,
          lastName: newActorArr.last_name,
          nickname: newActorArr.nickname,
        };
        return newActorObj;
      } catch (err) {
        console.log(err);
        console.log('resetting connection');
        pool.end();
        pool = new Pool(config, POOL_CONNECTIONS);
      }
    },
    deleteActor: async (_a: string, { id }: { id: string }) => {
      try {
        const client = await pool.connect();

        const {rows} = await client.queryObject<{id: number, first_name: string, last_name: string, nickname?: string}>({
          text: `
            DELETE FROM obsidian_demo_schema.actors
            WHERE id = $1
            RETURNING *;
            `,
          args: [id],
        })

        client.release();

        const deletedActorArr = rows[0];
        const deletedActorObj = {
          id: deletedActorArr.id,
          firstName: deletedActorArr.first_name,
          lastName: deletedActorArr.last_name,
          nickname: deletedActorArr.nickname,
        };
        return deletedActorObj;
      } catch (err) {
        console.log(err);
        console.log('resetting connection');
        pool.end();
        pool = new Pool(config, POOL_CONNECTIONS);
      }
    },

    updateNickname: async (
      _a: string,
      { input }: { input: { actorId: string; nickname: string } }
    ) => {
      try {
        const client = await pool.connect();

        const {rows} = await client.queryObject<{id: number, first_name: string, last_name: string, nickname?: string}>({
          text: `
            UPDATE obsidian_demo_schema.actors
            SET nickname = $2
            WHERE id = $1
            RETURNING * ;
            `,
          args: [input.actorId, input.nickname],
        })

        client.release();

        const updatedActorArr = rows[0];
        const updatedActorObj = {
          id: updatedActorArr.id,
          firstName: updatedActorArr.first_name,
          lastName: updatedActorArr.last_name,
          nickname: updatedActorArr.nickname,
        };
        return updatedActorObj;
      } catch (err) {
        console.log(err);
        console.log('resetting connection');
        pool.end();
        pool = new Pool(config, POOL_CONNECTIONS);
      }
    },

    associateActorWithMovie: async (
      _a: string,
      {
        input,
      }: { input: { movieId: string; actorId: string; respType: string } }
    ) => {
      try {
        const client = await pool.connect();
        await client.queryObject({
          text: `
            INSERT INTO obsidian_demo_schema.actor_films (film_id, actor_id)
            VALUES ($1, $2)
          `,
          args: [input.movieId, input.actorId],
        });

        client.release();

        if (input.respType === 'MOVIE') {
          const client = await pool.connect();

          const {rows} = await client.queryObject<{id: number, title: string, genre: string, release_dt: number}>({
            text: `
              SELECT * FROM obsidian_demo_schema.films
              WHERE id = $1
              `,
            args: [input.movieId],
          })

          client.release();

          const MovieArr = rows[0];
          const MovieObj = {
            id: MovieArr.id,
            title: MovieArr.title,
            genre: MovieArr.genre,
            releaseYear: MovieArr.release_dt,
          };
          return MovieObj;
        } else {
          const client = await pool.connect();

          const {rows} = await client.queryObject<{id: number, first_name: string, last_name: string, nickname?: number}>({
            text: `
              SELECT * FROM obsidian_demo_schema.actors
              WHERE id = $1
              `,
            args: [input.actorId],
          })

          client.release();

          const ActorArr = rows[0];
          const ActorObj = {
            id: ActorArr.id,
            firstName: ActorArr.first_name,
            lastName: ActorArr.last_name,
            nickname: ActorArr.nickname,
          };
          return ActorObj;
        }
      } catch (err) {
        console.log(err);
        console.log('resetting connection');
        pool.end();
        pool = new Pool(config, POOL_CONNECTIONS);
      }
    },
  },
};

export default resolvers;
