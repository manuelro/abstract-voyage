---




title: The taxonomy of dependencies in software and their associated risk
excerpt: "Analyzes dependency types in software engineering and the risk tradeoffs they introduce across systems and teams."
author: "Manu"
url: https://abstractvoyage.medium.com/a-reflection-on-the-taxonomy-of-dependencies-in-software-engineering-and-their-associated-risk-864e3a4c881
source:
    platform: "Medium"
    url: https://abstractvoyage.medium.com/a-reflection-on-the-taxonomy-of-dependencies-in-software-engineering-and-their-associated-risk-864e3a4c881
    originallyPublished: "2020-11-05"
heroAlt: "Taxonomy of dependencies cover illustration"
date: "2022-03-13"
tags:
    - Dependencies
    - Risk Management
    - Software Architecture
---

> Freedom is the only worthy goal in life. It is won by disregarding things that lie beyond our control. — Epictetus

![Taxonomy of dependencies cover illustration](/posts/medium-taxonomy-dependencies/hero.jpeg)

_Figure 1. Taxonomy of dependencies cover illustration._

TL;DR

In the biological world we depend on things, many things, more things than we would like to depend on. We depend on external dependencies such as the Sun to provide us with energy in the form of heat (thermal energy)and light (electromagnetic radiation) caused by an ancient chained nuclear reaction of the fusion type at the surface of our star. We depend on a fragile food chain, tied to an equally brittle ecosystem. We depend on loved ones who provide us comfort and support when needed.

We also depend on internal “things’’. Things created and constituted by thoughts, feelings and emotions. Some of us depend (again) on loved ones in order to feel part of a larger whole, some others depend on religion and spirituality.

Some of the aforementioned dependencies are organic and some others are virtual. Some of these dependencies have been created out of necessity, some others were there from the moment we were born, and some others were created without a clear purpose.

Dependencies can also be internal or external, disregarding their origin. The Sun is a clearly external dependency, completely out of our control (for now). Some other dependencies such as the much needed energy that our bodies need to continue working as expected are internal.

### Software Dependencies

Some dependencies cannot be avoided, but can be managed. Managing dependencies in software engineering is perhaps the cornerstone of success. In a world with vendors, third parties, providers, teams, people; the appearance of software dependencies is not a matter of *if*, but *when* and *how*. We argue, perhaps, that every software project has at least one dependency, and that the risk of failure increases as the number of *unmanaged dependencies* rise. That is why, perhaps, the management of such dependencies can be critical to the project success.

![Dependency taxonomy overview diagram](/posts/medium-taxonomy-dependencies/figure-01.jpg)

_Figure 2. A dependency taxonomy overview used to frame software risk._

### Dependency State

The state of a dependency can either be organic or virtual, both can either be internal or external in origin.
Organic Dependencies
Organic dependencies are long-lived dependencies. These tend to be created disregarding the intentionality or lack thereof from the team or software related to such dependency. Either the dependency was there before or at the moment of creation of the software system, or the dependency was initialized by means outside of the control of the team who owns the software systems or module. A good example of the existence of such dependencies is a third party API vendor for a maps geolocation service.
Virtual Dependencies
Virtual dependencies are the ones that were created by direct intervention of the team writing the software piece. These are hard-coded dependencies that usually do not have a major reason on why to exist. A good example of such dependency state type can be a user story poorly split, giving the chances of creating dependencies between user stories and thus increasing the risk of failure.

### Dependency Origin

As stated above, dependencies can either be of two origins, internal and external.
Internal Dependencies
Are those dependencies originated within the team and the system. Usually teams have full control over the internal dependencies, the management becomes easier as the dependency itself becomes more predictable in nature and thus, easy to manage. A very good example of an internal dependency in a software program using Object Oriented Programming, can be a class within a package, software engineers can easily change such class when required and as needed.
External Dependencies
External dependencies originate outside the domain of the software being written or the team who is writing the software itself. Teams do not have control over these dependencies other than version management and risk mitigation. Things can become rather harder to manage when the dependency itself is another team, external to the one writing the software piece, since the communication process and people skills need to be crafted in a way that allows the risk to continue at its minimum and both teams working in an orchestrated manner. An example of this kind of dependency can be the infrastructure managed by an external team of administrators.

### Dependency Risk Assesment

![Virtual dependencies increase risk when created without intent](/posts/medium-taxonomy-dependencies/figure-02.png)

_Figure 3. Virtual dependencies often signal lack of product or engineering clarity._

While assessing the risk of a given dependency, it is well known that the state of a dependency has a high impact in the project only if it is an organic dependency. Virtual dependencies, on the other hand, are prone to creation and destruction and thus such dependency can easily be removed from the project.

![External dependencies are volatile without strong versioning](/posts/medium-taxonomy-dependencies/figure-03.png)

_Figure 4. External dependencies are volatile without a clear versioning path._

On the other side of the dependencies spectrum, we have the risk associated to the origin of the dependency itself. External dependencies pose a higher risk because most of the times, — and under unmanaged scenarios — these tend to behave erratically and are more volatile in nature. Internal dependencies, on the other hand, pose a lower risk thanks to their manageability.

Dependencies are a fundamental part of every software engineering project, they allow us to move faster by avoiding repetition and by centralizing key functionality that several teams can share across the organization. But a bad management or lack thereof can negatively impact the outcome of a project by introducing fragility and premature failure into the system.

It is our call, then, to either live in a world with managed or unmanaged dependencies.
