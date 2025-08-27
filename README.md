
# Rainbow Recovery

A small browser game made together with kids and AI.

## Run locally

- Using Python 3 (built-in):
  ```bash
  python3 -m http.server 3000
  ```
  
- OR `serve` from `npm`

Then open http://localhost:3000 in your browser.

## Or with Docker

```shell
docker build -t rainbow-recovery . &&\
docker run --rm -p 3080:80 -it rainbow-recovery
```

