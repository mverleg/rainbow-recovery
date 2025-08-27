# Use the small Alpine-based Nginx image
FROM nginx:alpine

COPY *.html *.js *.css /usr/share/nginx/html/
COPY img/ /usr/share/nginx/html/img
COPY red/ /usr/share/nginx/html/red

COPY nginx.conf /etc/nginx/conf.d/default.conf

# RUN find /usr/share/nginx/html/ && exit 1

EXPOSE 80

