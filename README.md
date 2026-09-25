# Optimal Asimov: A website to optimize Asiomv's bibliography

This repository contains a website deployed [here](https://optimal-asimov.netlify.app) to optimize what collections to buy in order to read a subset of Asimov's [science fiction bibliography](https://www.isfdb.org/cgi-bin/ea.cgi?5). It uses GNU's Linear Programming library (GLPK) compiled to webassembly with emscripten and a minimal UI with P5.js

## Motivation

There are many guides regarding Asimov's science fiction but they tend to focus on the order of reading things, not what to read. Usually _what to read_ means the Extended Foundation Universe but that's just a part of all of his science fiction works. 

_Before I decide in which order I read things I frist want to know what's out there to be read_ I thought. It turns out that the publications are quite chaothic. Because of how there were written and published there are a total of 204 short stories and 51 collections containing part of the stories. This means that there is not a book containing the first 10 stories, another one with the next 10 and so on. There is a book containing some stories. There is a book containing some other stories, which may be contained by the first book aswell. There may be a book that all of its stories are collected in other books except for one new story...

What if I already own some of this books, which other books should I buy if I want to minimize buying stories I already have in other books? What if this book is unavailable in my region, what's the optimal solution there?

This is the problem that this website tries to solve.

## Mathematical base
Because Math and Latex are fun, there is also a document with the mathematical base of this project [here](https://github.com/gerardjensen/optimal-asimov/blob/main/ilp-doc.pdf) with proofs.

## AI Usage
AI has been used in this exhaustive list:
* Generating the correct `emcc` command to generate the webassembly.
* Generating some CSS for the website.
* Using emscripten's `HEAP32` API (because I couldn't find propper documentation anywhere)

In no other places has AI been used, especially not in the mathematical base nor in the C backend.
