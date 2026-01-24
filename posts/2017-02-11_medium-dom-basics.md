---




title: Understanding the Document Object Model (DOM)
excerpt: "Introduces the Document Object Model (DOM), explaining how web pages are structured and how JavaScript interacts with nodes and events."
author: "Manu"
url: https://abstractvoyage.medium.com/understanding-the-dom-basics-1c0b35970d90
source:
    platform: "Medium"
    url: https://abstractvoyage.medium.com/understanding-the-dom-basics-1c0b35970d90
    originallyPublished: "2017-02-11"
tags:
    - DOM
    - Web Development
    - JavaScript
---

> The Document Object Model can be understood as a collection of objects with properties and methods. Each object is organized at a certain level in the tree of objects. The tree is composed of a root, branches and leaves.

![Document Object Model overview](/posts/medium-dom-basics/hero.jpg)

_Figure. The Document Object Model can be understood as a collection of objects with properties and methods. Each object is organized at a certain level in the tree of objects. The thee is composed of a root, branches and leaves._

Brief
The **DOM**(**Document Object Model**) is one of those things we take for granted, even though we interact with it most of the time (if you are an assiduous Web consumer). HTML offers its own flavor of DOM to JavaScript to manipulate its tags (nodes). XML and SVG also offer JavaScript their own flavor of DOM, slightly different than HTML’s DOM, but with some similarities in common. This article will focus specifically on the HTML DOM.

Definition
The DOM is a three of objects; that is why it is called the Document *Object*Model, with parents, child nodes and siblings. Just as a tree, the DOM has a root (e.g. `<html>`), branches (e.g. `<head>`) and leaves.

The [RFC for DOM Level 2 Core](https://www.w3.org/TR/2000/REC-DOM-Level-2-Core-20001113/) describes the DOM as follows:

> Document Object Model Level 2 Core, a platform- and language-neutral interface that allows programs and scripts to dynamically access and update the content and structure of documents

I suggest you reading this document for further and granular knowledge about the DOM and the mechanisms that rely in it.
The topology


The DOM objects relate to each other in a certain way, but there are some relationships that will be present in most situations:

![DOM tree with parent, child, and sibling nodes](/posts/medium-dom-basics/figure-01.jpg)

_Figure. In the image above we can see a DOM tree with parent, child and sibling nodes in it._


- **Parent nodes:** Are nodes that nest further nodes in them. Examples of nodes that most of the time contain nested nodes are the ``<html>`` and ``<body>`` tags.
- **Child nodes:** Child nodes have something in common: they have a parent. Examples of child nodes can be ``<head>``, ``<body>`` and ``<p>``.
- **Sibling nodes:** Sibling nodes are nodes that are placed next to another node in the tree. A paragraph (``<p>``) node can be a sibling of a heading (``<h1>``) node.

DOM nodes

The DOM is made of *nodes*. A node is the minimal unit that a DOM tree is made of. Each element in a well formatted HTML will become a node. Nodes have properties and methods attached to them. During the creation of the DOM, the browser attaches the attributes, the HTML itself, the styles and the events to each node. The browser then provides JavaScript (and other languages) with an API (Application Programming Interface) that will serve to modify, insert, alter or remove any node in the DOM tree. In fact, each node is an interface on its own.

Each node will inherit from the Node interface which contains some basic functionality attached to it. This functionality will be then accessible to the language (JavaScript in this case) to allow it to modify the node properties or read the current state of the node.

You can see a node like a box containing all kind of fun stuff you can play with, including other nodes (the nested nodes). Properties such as *[node].nodeName* or *[node].firstChild* and *[node].nextSibling*. See some of the methods attached to each node [here](https://developer.mozilla.org/en/docs/Web/API/Node).

Event binding

One of the most important features of the DOM is that it provides you with event binding functionality out of the box.

> Event binding is the act of attaching event listeners that will be triggered based upon actions on certain nodes in the Document Object Model.

With event binding you can *listen*for events and wait until the event is fired to act accordingly. Each node can listen to multiple events.

In the following [snippet](http://codepen.io/manuelro/pen/jyQoOe)we have a button, because this button is a node itself we can “attach” event listeners to it. The code will be explained in the comments.

> The HTML
<!-- code:include file="snippet-01.html" lang="html" title="index.html" -->

> The JavaScript
<!-- code:include file="snippet-02.js" lang="js" title="script.js" -->

> The result
[Original asset link](https://medium.com/media/264d241217b7fa10b70085e8602c32d8/href)

Further reading
If you are really interested in understanding more about how the DOM works and how it internally programs the events and listens to them, I encourage you reading about the DOM Event Loop or Traversing the DOM. Both topics will be an inspiration for future articles.
