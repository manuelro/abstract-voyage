---




title: Gzipping vs minification
excerpt: "Explains the difference between gzip compression and minification and how both improve web performance and bandwidth usage."
author: "Manu"
url: https://abstractvoyage.medium.com/gzipping-vs-minification-what-the-heck-ba698fa6037c
source:
    platform: "Medium"
    url: https://abstractvoyage.medium.com/gzipping-vs-minification-what-the-heck-ba698fa6037c
    originallyPublished: "2017-01-15"
tags:
    - Web Performance
    - Compression
    - Minification
---

> Gzipping and minification are regarded by some as two alternative solutions for the same problem, but in reality, each one of these two processes do a very different task.

In this article we are going to discuss both of them, and how different they can be from each other.
![Gzipping vs minification](/posts/medium-gzipping/hero.png)

### The Internet is a like a bottleneck

The internet behaves just like a bottleneck, and if you have had the chance to hear that very same phrase applied to car jams, then you could already have figured out that bottlenecks (in the car jams context) are caused by multiple reasons:

1. Car accidents on an intersection of at the middle of the road
2. Traffic officers doing checkouts for some weird reason
3. Large vehicles that transit the road quite slowly
4. [enter your reason here]

The reality is that bottlenecks can be caused by infinity of reasons, but on the Internet, these are caused by big-fat-ass uncompressed and unminified files that someone decided to throw as is, ignoring network usage.

### Minification

> Minification is the process of minifying something, and we talk about minifying something, we are talking about making it shorter, smaller, tinier.

In the Internet context and very often in Web technologies, we are talking about removing unnecessary stuff from our files, like for instance: headings, spaces, author information, comments, breaklines, among others.

Take by example the following CSS file, with its minified and unminified versions side by side:

_Figure. The unminified version has comments, spaces and line breaks intact. On the other hand, the minified version gets rid of all that unnecessary data._

In the above image we can see that the difference in weight between the minified and the unminified versions is breathtaking. If we do some math, we come to realize that we have made the file an astonishing 52% lighter by just getting rid of all the data we don't really need.

We, as humans, still need the comments, the line breaks, the white spaces, the semicolons, because we simply cannot process that data as a single line, that is why the minification process is not intended to be made manually. Instead, thanks to the development of modern mechanisms, frameworks and workflows, the minification happens to take place during the building stage of our project, right before releasing to production.

### Gzipping

> gzip (GNU zip) is a compression utility designed to be a replacement for compress.

How Gzip actually works might be a little bit out of the scope of this article, but it is worth nothing to point out that it works amazingly well and can compress a file up to and 80% of its uncompressed weight.

Contrary to what most people out there believe, the process most of the times takes place on the server side. Nowadays most servers support the utility and make sure they send over a compressed version of the file, then, on the client side, the browser decompresses the file and shows it as it was before compression.

The gzipping process happens by the implementation of two algorithms: **Abraham Lempel lz77 Algorithm** and **Huffman’s Algorithm**.

When the server receives a negotiation request for a compressed version of the content required by the client it applies the lz77 algorithm first, and then it passes the results to Huffman Algorithm.

What the server passes to the client is a set of bits (zeroes and ones) which the client knows how to decode. And it does.

### Applying both: Gzipping and minification

In real-world scenarios it is always advised to apply both: minification and compression. It can lead to a very lightweight version of your CSS, JS, and HTML files. A good UX relies upon (partially) the proper use of the available bandwidth, your users will certainly be happier.

After applying both, minification and gzipping, our bottleneck is no longer slowed by large uncompressed files.

_Figure. A faster and better UX relies upon little optimizations, and Gzipping and minification are one of them._
