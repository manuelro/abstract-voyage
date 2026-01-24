---





title: Mastering the SOLID principles
excerpt: "A practical guide to the SOLID principles in object-oriented programming and how they improve maintainable software architecture."
author: "Manu"
url: https://abstractvoyage.medium.com/mastering-solid-programming-principles-3ba15c5df942
source:
    platform: "Medium"
    url: https://abstractvoyage.medium.com/mastering-solid-programming-principles-3ba15c5df942
    originallyPublished: "2016-12-24"
date: "2022-03-13"
tags:
    - SOLID
    - Object-Oriented Design
    - Software Architecture
---

![Mastering the SOLID principles](/posts/medium-mastering-solid/hero.png)

> SOLID stands for the 5 principles of Object Oriented Programming developed by Robert C. Martin back in the 90’s. The principles are intended to serve as a guide for software architects and developers to make their programs more robust, flexible and reusable. In this quick guide we are going to review each of the 5 principles in detail.

### What does SOLID mean?

SOLID is an acronym composed of first letter of each of the 5 SOLID Principles. These principles can be listed as follows:

1. S — Single Responsibility Principle
2. O — Open-Closed Principle
3. L — Liskov Substitution Principle
4. I — Interface Segregation Principle
5. D — Dependency Inversion Principle

### Why do SOLID Principles matter?

While designing a program or system, its maintainability, testability, usability, and scalability are critical to the business, the people working on it and any future collaborator. The SOLID Principles make a system easy to maintain, easy to understand, easy to read, easy to change. That is why SOLID Principles have been widely adopted as a good practice and a must-have for any system that is taken seriously from its conception to new releases.

So, let’s get started…

### 1. Single Responsibility Principle (the S in the SOLID)

> The Single Responsibility Principle states that a class (function or procedure) must have one single reason to change.

That is, that if in the near future, a class, function or procedure happens to change, that change must respond to a unique reason (not two, nor three, nor four…) of why the change should take place. For instance:
Think about a banking system
We have a class that does two things:

First, checks if we have funds in our account. and second, processes the transaction. If we analyze this class from a SOLID perspective, we come to realize that this class is not a Single Responsibility Class, it does two things, it has two reasons why to change, and that breaks the Single Responsibility Principle in a very rude way.

_Figure. A dual responsibility class has two reasons to change, it breaks the SRP_

> A Single Responsibility Class (SRC) is a class that assigns all of its instance variables in the constructor and whose instance variables are used by all of its public methods.

The right way to define a SRC, based on the previous banking example, should be to have two separated and specialized classes, each one having a single reason to change.

_Figure. Two SRC are better than a Dual Responsibility Class, the RSP is respected and your system can scale well_

### 2. Open-Closed Principle (the O in the SOLID)

> The Open-Closed Principle states that a class should be available to extension, but not for modification.

When we talk about extending something, we are talking about inheriting from something (an abstract something). The Open-Closed Principle states just that, a class can be inherited, but must not be modifiable by subclasses. The Open Closed-Principle is easily applied with inheritance. Where we have a class that inherits a certain premade behaviour from a parent class.

The main idea in this principle is to change a system without altering its core. This is how the most successful frameworks out there work. To extend them, you do not need to modify them.

The mechanisms behind the OCP vary, but consider using abstraction and interfaces as a way to open a class to extensibility, but closing it for modifiability. Subclasses that inherit from the abstract class must always implement their own way of doing things, without altering the parent class. Polymorphism is another way to achieve this principle.

### 3. Liskov Substitution Principle (the L in the SOLID)

> A child class should behave as a the parent in classes which only know about the parent class.

The **Liskov Substitution Principle** is very straightforward. Think about a parameter object we are passing through classes in a system, just as a needle in a group of fabric layers. When a class requires the parent parameter object, we pass in the child parameter object, but due to inheritance, that child behaves just as the parent parameter object, and the class receiving the parameter object cannot really spot the difference. The class expected an instance of the parent parameter object, but instead got an instance of the child parameter object, which by inheritance is also the parent. See the following illustration for a better understanding of the LSP.

_Figure. In the illustration above, the checker class expected an instance of the parent parameter object, but got an instance of the child parameter object instead. But since the child parameter object inherits from the parent parameter object, it has all the information necessary to behave just as the parent parameter object._

### 4. Interface Segregation Principle (the I in the SOLID)

> A class should depend upon only on things it actually needs or uses.

The **Interface Segregation Principle** is one of the most important ones. It states that a class should only get what it needs in order to properly work and do its job. In the background, abstraction, polymorphism and inheritance are the mechanisms this principle relies upon.

This principle is about **specialization**, a class does a certain task in a specialized way, by depending on abstract classes, and not on concrete ones.

### 5. Dependency Inversion Principle (the D in the SOLID)

> A class must not be concerned regarding where is gets its data from.

The Dependency Inversion Principle is perhaps the most misunderstood one. And I don’t blame new software engineers and developers, it is hard to get your head around this one without getting to the conclusion that you will simply ignore it and pass along.

This principle is perhaps the most critical one, it helps us decoupling things (modules), making sure our system works well no matter where the data they need comes from. That data can come from a database, an API service, an external file, or user-generated input.

Think about our banking system, the checker must get the funds from somewhere (and its most likely from an external service or DB). We decouple this by depending upon abstractions on compilation time, that dependency will get inverted during execution time (because of the abstraction). See the following illustration to get a better idea:

_Figure. In the illustration above, the Bank System depends upon an abstract Database Interface that communicates directly with the resource (the DB), but due to polymorphism, the dependencies are inverted at execution time. That is why it is called dependency inversion._

### Conclusions

SOLID Principles can help us create robust, flexible, and reusable systems that are easy to understand, easy to change, easy to maintain and therefore, easy to scale. I really hope you enjoyed this brief review about the SOLID principles, and that you apply everything in here in your next project.

Feel free to leave a comment. :)
