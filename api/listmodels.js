import fetch from 'node-fetch';
import 'dotenv/config';

const apiKey = process.env.GEMINI_API_KEY;
const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

fetch(url)
  .then(res => res.json())
  .then(data => {
    console.log(data.models);
  })
  .catch(err => {
    console.error('Error:', err);
  });