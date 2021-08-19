FROM denoland/deno:1.11.3

EXPOSE 3000

WORKDIR /usr/app

USER deno

COPY . .

CMD [ "run", "--unstable", "--allow-net", "--allow-env", "--allow-read", "new-server.tsx" ]