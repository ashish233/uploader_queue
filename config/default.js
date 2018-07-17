module.exports = {
  opt: {
    endpoint: "http://sunilmore-rest-api.herokuapp.com"
  },
  logKeywords:['processed','processing'],
  errKeywords:['exception','killed'],
  supportedFileFormat:['.csv','.xlsx','.xml','.xls'],
  redis: {
    prefix: "catalogbatch",
    redis: {
      port: 6379,
      host: "localhost",

      db: 3 // if provided select a non-default redis db
    }
  },
  shScript: "/Users/SQR-Mallinath/Documents/project/showcase/node_modules/opt-lib/runnode.sh",
  ssh: {
    host: "ec2-54-186-176-189.us-west-2.compute.amazonaws.com",
    port: 22,
    username: "ec2-user",
    privateKeyPath: "/path/to/private/pem/file"
  },
  brands: [
    {
      optId: "1",
      name: "Brand1",
      priority: "normal",
      xml: {
        parentTag: "stockFile.stockItem"
      },
      ftp: {
        host: "ftp.filezapp.com",
        port: 21,
        user: "sunil@filezapp.com",
        password: "Laxman_usha90",
        pass: "Laxman_usha90"
      },
      dir: {
        upload: "/uploadrewrite/1/upload/",
        enqueued: "/uploadrewrite/1/enqueued/",
        processing: "/uploadrewrite/1/processing/",
        error: "/uploadrewrite/1/error/",
        processed: "/uploadrewrite/1/processed/",
        ignore: "/uploadrewrite/1/ignore/",
        backup:"/uploadrewrite/1/backup/"
      }
    },
    {
      optId: "2",
      name: "Brand2",
      priority: "normal",
      xml: {
        parentTag: "stockFile.stockItem"
      },
      ftp: {
        host: "ftp.filezapp.com",
        port: 21,
        user: "sunil@filezapp.com",
        password: "Laxman_usha90",
        pass: "Laxman_usha90"
      },
      dir: {
        upload: "/uploadrewrite/2/upload/",
        enqueued: "/uploadrewrite/2/enqueued/",
        processing: "/uploadrewrite/2/processing/",
        error: "/uploadrewrite/2/error/",
        processed: "/uploadrewrite/2/processed/",
        ignore: "/uploadrewrite/2/ignore/",
        backup:"/uploadrewrite/2/backup/"
      }
    }
  ]
};
