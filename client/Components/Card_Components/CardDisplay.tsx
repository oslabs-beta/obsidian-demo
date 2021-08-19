import { React, useObsidian, BrowserCache } from '../../../deps.ts';
declare global {
  namespace JSX {
    interface IntrinsicElements {
      div: any;
      article: any;
      h4: any;
      ul: any;
      li: any;
      button: any;
      form: any;
      input: any;
      label: any;
      select: any;
      option: any;
    }
  }
}
const CardDisplay = (props: any) => {
  const allMoviesQuery = `query {
    movies {
      id
      title
      releaseYear
      actors {
        id
        firstName
        lastName
      }
      genre
    }
  }
`;

  const [valueNickname, setValueNickname] = (React as any).useState('');
  const [valueMovie, setValueMovie] = (React as any).useState('');
  const [value, setValue] = (React as any).useState('');
  const { query, mutate, cache, setCache, clearCache } = useObsidian();
  if (props.display === 'Movies') {
    const {
      title = '',
      releaseYear = 0,
      actors = [],
      id,
      genre = '',
    } = props.info;
    const handleChange = (event: any) => {
      setValue(event.target.value);
    };

    const handleSubmit = async (e: any) => {
      e.preventDefault();
      const associateActorWithMovie = `
        mutation {
          associateActorWithMovie (input:{actorId:${props.actorList[value]}, movieId:${e.target.parentNode.parentNode.id}, respType:MOVIE}){
            ... on Movie{
              id
              actors {
                id
                movies{
                  id
                }
              }
            }
            ... on Actor{
              id
            }
          }
        }
      `;
      console.log('gql queryStr', associateActorWithMovie);
      const res = await mutate(associateActorWithMovie);
      console.log('response from server', res);
      const newResponse = await query(allMoviesQuery);
      props.setCardsResponse(newResponse.data);
    };
    const deleteMovie = async (e: any) => {
      // const deleteMovieMutation = `mutation {deleteMovie(id:${e.target.parentNode.parentNode.id}){
      const deleteMovieMutation = `mutation {deleteMovie(id:${props.id}){  
            id
            title
          }
          }`;
      console.log(e, props.id);
      await mutate(deleteMovieMutation, { toDelete: true });
      await setCache(new BrowserCache(cache.storage));
      const newResponse = await query(allMoviesQuery);
      props.setCardsResponse(newResponse.data);
      // props.setDisplay('all movies');
    };
    const arrOfOptions: any = [];
    let outputActor: any = '';
    actors.forEach((actor: any) => {
      outputActor = outputActor + actor.firstName + ' ' + actor.lastName + ', ';
    });
    const arrOfActors = Object.keys(props.actorList);
    arrOfActors.forEach((actor: any, index: number) => {
      arrOfOptions.push(
        <option key={`actor-${index}`} value={actor}>
          {actor}
        </option>
      );
    });
    return (
      <article
        className="bg-gray-600 w-cards h-cards border m-1 overflow-hidden shadow sm:rounded-lg"
        id={props.id}
      >
        <div className="flex flex-column justify-between h-full px-4 py-3 sm:p-6">
          <div>
            <h4 className="text-white text-lg font-bold border-b py-1">
              {title}
            </h4>
          </div>
          <ul className="text-white bg-transparent">
            <li className="text-white py-1">
              {' '}
              <span>
                <strong>Release Year: </strong>
              </span>{' '}
              {releaseYear}
            </li>
            <li className="text-white py-1">
              {' '}
              <span>
                <strong>Actors: </strong>
              </span>
              {outputActor}
            </li>
            <li className="text-white py-1">
              {' '}
              <span>
                {' '}
                <strong>Genre: </strong>
              </span>
              {genre}
            </li>
          </ul>
          <form onSubmit={handleSubmit}>
            <select
              className="m-1 p-1 block w-full  pr-4 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
              required
              value={value}
              onChange={handleChange}
            >
              <option value="">Add Actor</option>
              {arrOfOptions}
            </select>
            <input
              className="p-1 m-1 w-full border-transparent text-sm text-center font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              type="submit"
              value="Submit"
            />
          </form>
          <button
            className="p-1 m-1 w-full border-transparent text-sm text-center font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
            onClick={deleteMovie}
          >
            Delete Movie
          </button>
        </div>
      </article>
    );
  } else if (props.display === 'Actors') {
    const { firstName, lastName, movies = [], nickname = '', id } = props.info;
    const allActorsQuery = `query {
      actors {
        id
        firstName
        lastName
        nickname
        movies {
          id
          title
          releaseYear
          genre
        }
      }
    }
  `;
    const handleChange = (event: any) => {
      setValueMovie(event.target.value);
    };
    const handleSubmit = async (event: any) => {
      event.preventDefault();
    //       const associateActorWithMovie = `
    //   mutation addingActor{
    //     associateActorWithMovie(input: { actorId: ${event.target.parentNode.id}, movieId: ${props.movieList[valueMovie]}, respType:ACTOR}){
    //     ... on Actor{
    //           id
    //           movies {
    //             id
    //             actors {
    //               id
    //             }
    //           }
    //         }
    //         ... on Movie{
    //           id
    //         }
    //       }
    //     }
    // `;
    const associateActorWithMovie = `
    mutation addingActor{
      associateActorWithMovie(input: { actorId: ${props.id}, movieId: ${props.movieList[valueMovie]}, respType:ACTOR}){
      ... on Actor{
            id
            movies {
              id
              actors {
                id
              }
            }
          }
          ... on Movie{
            id
          }
        }
      }
    `;
      console.log('movieList', props.movieList);
      console.log('valueMovie', valueMovie);
      console.log('gql queryStr', associateActorWithMovie);
      const res = await mutate(associateActorWithMovie);
      console.log('response from server', res);
      const newResponse = await query(allActorsQuery);
      props.setCardsResponse(newResponse.data);
    };
    const updateNickname = `
    mutation {
      updateNickname(input:{actorId:${props.id}, nickname: "${valueNickname}" }){
        __typename
        id
        nickname
      }
    }
  `;
    const handleChangeNickname = (event: any) => {
      setValueNickname(event.target.value);
    };
    const handleSubmitNickname = async (event: any) => {
      event.preventDefault();
      await mutate(updateNickname);
      const newResponse = await query(allActorsQuery);
      props.setCardsResponse(newResponse.data);
      setValueNickname('');
    };
    const arrOfOptions: any = [];
    const arrOfMovies = Object.keys(props.movieList);
    arrOfMovies.forEach((movie: any, index: number) => {
      arrOfOptions.push(
        <option key={`movie-${index}`} value={movie}>
          {movie}
        </option>
      );
    });
    let outputMovie: any = '';
    movies.forEach((movie: any) => {
      outputMovie = outputMovie + movie.title + ', ';
    });
    //deleting actor
    const deleteActor = async (e: any) => {
      // const deleteActorMutation = `mutation {deleteActor(id:${e.target.parentNode.id}){
      const deleteActorMutation = `mutation {deleteActor(id:${props.id}){
      id
      firstName
    }
    }`;
      await mutate(deleteActorMutation, { toDelete: true });
      await setCache(new BrowserCache(cache.storage));
      const newResponse = await query(allActorsQuery);
      props.setCardsResponse(newResponse.data);
    };
    return (
      <article
        className="bg-gray-600 w-cards h-cards border m-1 overflow-hidden shadow sm:rounded-lg"
        id={props.id}
      >
        <div className="flex flex-column justify-between h-full px-4 py-3 sm:p-6">
          <div>
            <h4 className="text-white text-lg font-bold border-b py-1">
              {firstName + ' ' + lastName}
            </h4>
          </div>
          <ul className="text-white bg-transparent">
            <li className="text-white py-1">
              {' '}
              <span>
                <strong>Movies:</strong>
              </span>{' '}
              {outputMovie}
            </li>
            <li className="text-white py-1">
              {' '}
              <span>
                <strong>Nickname:</strong>
              </span>{' '}
              {nickname}
            </li>
          </ul>
          <form onSubmit={handleSubmitNickname}>
            <input
              className="shadow-sm m-1 p-1 w-full focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
              type="text"
              placeholder="Add Nickname"
              value={valueNickname}
              onChange={handleChangeNickname}
            />
            <input
              className="p-1 m-1 w-full border-transparent text-sm text-center font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              type="submit"
              value="Submit Nickname"
            />
          </form>
          <div>
            <form onSubmit={handleSubmit} id={props.id}>
              <select
                className="m-1 p-1 block w-full  pr-4 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
                required
                value={valueMovie}
                onChange={handleChange}
              >
                <option value="">Add Actor</option>
                {arrOfOptions}
              </select>
              <input
                className="p-1 m-1 w-full border-transparent text-sm text-center font-medium rounded-md shadow-sm text-white bg-yellow-600 hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
                type="submit"
                value="Submit Actor"
              />
            </form>
            <button
              className="p-1 m-1 w-full border-transparent text-sm text-center font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-yellow-500"
              onClick={deleteActor}
            >
              Delete Actor
            </button>
          </div>
        </div>
      </article>
    );
  }
};
export default CardDisplay;
