const fs = require('fs')
const path = require('path')


const PRIVATE_KEY = fs.readFileSync(path.resolve(__dirname, './keys/private.key'))
const PUBLIC_KEY = fs.readFileSync(path.resolve(__dirname, './keys/public.key'))



const PUBLIC_API_KEY = process.env.PUBLIC_API_KEY

module.exports = {
  PRIVATE_KEY,
  PUBLIC_KEY,
  PUBLIC_API_KEY
}