---




title: Real-Time Feature Toggles with React and LaunchDarkly
excerpt: "Walkthrough of real-time feature flags in React using LaunchDarkly to manage releases safely and continuously."
author: "Manu"
url: https://abstractvoyage.medium.com/real-time-feature-toggling-with-react-and-launchdarkly-1d4c40c117df
source:
    platform: "Medium"
    url: https://abstractvoyage.medium.com/real-time-feature-toggling-with-react-and-launchdarkly-1d4c40c117df
    originallyPublished: "2019-09-15"
date: "2022-03-13"
tags:
    - Feature Flags
    - React
    - LaunchDarkly
    - Continuous Delivery
---

![Real time feature toggles with React and Launch Darkly](/posts/medium-feature-toggles-react/hero.png)

**Real-Time Feature Toggles with React and LaunchDarkly**

*A practical, real-time toggling example using WebSockets*

### Feature Toggles: A Quick Primer

Feature toggles are binary representations of states, which means that these can only be *on* or *off*(exclusive). A feature toggle is either true (*ON*) or false (*OFF*), usually having a non-existing value set to fallback to *off*. We can continue making assumptions on states, we can either use 1 or 0, day or night, or even white or black.

Throughout history feature toggles have also been assigned other names. Some engineers tend to use different semantics for naming feature toggles. Some other names we can see throughout a multitude of books and literature are simply toggles or *feature flags*. In this article we’ll refer to these binary states as *feature toggles*.

### Building Blocks of a Toggle Strategy

- **The Toggleable Feature:** A feature (end-user facing or logical branch within your code base) that will be turned on or off depending on the business or logic needs and current state.
- **The Toggle Point:** A point within the system in which our *Toggle Router* will branch in to two different scenarios: it will either turn the feature *on* or *off*.
- **The Toggle Router:** This will read the toggle state and route appropriately to turn the toggle on or off.

### Common Use Cases

Feature toggles present a variety of use cases. Most uses rely on the binary nature of feature flags to represent two states for features: in progress (off) and feature-ready (on). Business and product owners and software engineers can the turn the toggles on or off depending on the progress made in a certain feature. A feature can be understood as a usable and end-user functionality or as a functionality for internal purposes (at the algorithm level)

### What Is LaunchDarkly?

LaunchDarkly is a feature toggling system with a robust CI/CD and DevOps culture embedded into it. LaunchDarkly provides us with an easy-to-use feature toggling panel segregated by environment. You can create the environments your project needs, create the toggles and these will be available in all the environments you previously created. Toggles can be toggled on a per-environment basis, which means that if turn a feature toggle on in the Development environment, this will be toggled in isolation and the QA environment will not see itself affected by side-effects (this is very good).

LaunchDarkly also offers you two kinds of SDK. The client SDK for client-specific implementations with an op-in for streaming (Websocket) adaptor for real time toggling, and the server side SDK for more static toggles. Which one to use depends on your case in specific. In this tutorial we’ll implement the client-side toggling SDK with real-time streaming in order to listen for changes.

Refer to LaunchDarkly docs on SDKs for client and server side. They offer adaptors for many languages, libraries and frameworks: [https://docs.launchdarkly.com/docs/getting-started](https://docs.launchdarkly.com/docs/getting-started)

For a matter of concretion and a sense of end-to-end completion we’ll implement React as our client-side library. If you would like to dig deeper into the core principles on Feature Toggles read this great article in Martin Fowler’s blog written by Pete Hodgson on Feature Toggles: [https://martinfowler.com/articles/feature-toggles.html](https://martinfowler.com/articles/feature-toggles.html) (good stuff)

### Project Scaffolding

**Core Ingredients**
For the implementation of the Feature Toggles we’ll need the following parts:

1. React application (we’ll use create-react-app)
2. LaunchDarkly
3. The account
4. Two environments: Development and Production
5. Three Feature Toggles
6. A feature, we’ll toggle certain navigation items based on the environment and toggle state for each
**React App**
The React application we’ll create is a very straightforward container with a simple navigation menu with certain items.

**Commands:**

```bash
npx create-react-app ld-react
cd ld-react/
npm start
```

In order to speed things up you can go ahead and clone the repository that lives right now in Git by running the following commands (make sure you’re located in the desired parent folder for this repository, I usually choose ~/Documents for this):

```bash
git clone https://github.com/manuelro/ld-react
cd ld-react
git pull --tags
git checkout tags/v1.0.0
```

Tags [v1.0.0](https://github.com/manuelro/ld-react/tree/v1.0.0) has no LaunchDarkly implementation yet. This tag only includes the scaffolding and the base architecture members (HOC, components, data, modules) and some cleanup of Create React App in order to keep our project clean and focused, no fancy styling at this moment.

### Scaffolding Walkthrough

As mentioned above, the tag v1.0.0 has no LaunchDarkly implementation yet, but this is a good starting point to get up and running in understanding the project inner structure (we’ll keep it simple) and the intention for the folders:

1. ~/components: this hosts the components using index.js convention
2. ~/hoc: this stores the Higher Order Components (see https://reactjs.org/docs/higher-order-components.html), we’ll create a couple HOCs in order to implement LaunchDarkly
3. ~/modules: simple JS modules that export ES6 classes
4. ~/data: simply implement the classes defined in the modules folder in order to mock data we’ll need for our implementation of the UI

### LaunchDarkly Higher-Order Components

LaunchDarkly exposes an SDK for JavaScript and a more concrete one for React. In order to use this SDK you must install it running the following command: *npm i — save launchdarkly-react-client-sdk*

After installing the LaunchDarkly SDK you can now start using it to create the HOCs you’ll need in order to connect your components to LaunchDarkly. In our case we’ll create two HOCs, one responsible to connect and provide our application with the LaunchDarkly server (the toggles will be provided using React’s context API, see: [https://reactjs.org/docs/context.html](https://reactjs.org/docs/context.html)); and a second HOC to transform a component into a toggles consumer (consumed from React’s context API).

**Toggle Router Component**

We’ll need a *Feature Toggle Router*. This Router (in its simplest form) receives properties (vía props): *toggleName*, *flags*, *children* and *offFallback*.

### LaunchDarkly Setup

Make sure you have a valid LaunchDarkly account (you can start a trial if you haven’t done so). Continue with the following steps in order to set this up:

1. Go to the projects section: https://app.launchdarkly.com/settings/projects
2. Click on the “New Project” button, name it “LD React”
3. In the LD React project section click the “New Environment” button
4. Copy the Client Side ID
5. Paste the Client Side ID in the withTogglesProvider component configuration object where, replace the string that reads “{REPLACE WITH LD CLIENT SIDE ID}” with the real value for development purposes
6. Get back to LaunchDarkly, switch to the LD React project, and then to the Development environment we previously created
7. Create three flags as follows: Home, Dashboard, About. Make sure you make each one of the flags available for the Client SDK by enabling the option below
8. At this stage wiring in regards to LaunchDarkly is done. You’re ready to start implementing your toggles in your React application

### Implementation Plan

Once the wiring process for code and LaunchDarkly is done we can now move on to the implementation phase. In this stage we look forward to explore ways to implement the moving parts and integrate them into the system. You can also switch to tag [v1.1.0 of the demo repository](https://github.com/manuelro/ld-react/tree/v1.1.0).
**Architecture Recap**
**withTogglesProvider (provider HOC)**

This HOC connects you to the LaunchDarkly server and puts the flags within React Context API. In our case we’ll use withLDProdiver HOC exposed by LaunchDarkly, we’ll also have the option streaming set to true in order to open a Websocket for real-time data transit.
<!-- code:include file="withTogglesProvider.js" lang="js" title="withTogglesProvider.js" -->

**withTogglesConsumer (consumer HOC)**

This HOC extracts the flags from the React Context API. In our case we’ll use withLDConsumer HOC exposed by LaunchDarkly, no other configuration object is needed for this. It’ll allow us to access LaunchDarkly flags through React Context API.
<!-- code:include file="withTogglesConsumer.js" lang="js" title="withTogglesConsumer.js" -->

**ToggleRouter (routing HOC)**

The Feature Toggles Router. This will receive the toggles (flags), the toggle name we’re trying to verify, and some extra properties in order to work. It’ll use the children when the toggle is on and the offFallback when the toggle is off. This also uses the asTogglesConsumer to extract the toggles using React Context API and use them accordingly.
<!-- code:include file="ToggleRouter.js" lang="js" title="ToggleRouter.js" -->

**Implementing ToggleRouter**

In our Nav component we’ll import the ToggleRouter component. Since we added an extra property to each of the nav items (in ~/data/nav.js) we now use this flag to compare it to the flags coming from LaunchDarkly and provided to us by the ToggleRouter component as a property.

We simply wrap out Nav item with the ToggleRouter component (the nav.items.map) and pass in the appropriate properties to the ToggleRouter component. The application should be ready to be tested.
<!-- code:include file="Nav.js" lang="js" title="Nav.js" -->

### Testing the Integration

In order to test the integration we must have our application running in development mode, make sure you follow the create-react-app instructions to start the local development environment:

1. Go to http://localhost:3000/ or the port the React app is running at
2. Observe the navigation items (one feature flag for each in the development environment in LaunchDarkly)
3. Switch to LaunchDarkly panel, in the development environment, feature flags
4. Turn feature flags on and off as you want
5. Notice the navigation appearing and disappearing in real-time

### Closing Thoughts

Modern systems require modern implementations of best practices such as Feature Toggles. Feature Toggles offer you as the software engineer, the product manager and the business owner great alternatives and power when it comes to improving the delivery of value to your customers. It can make a difference between you and your competitors and can set you apart from the rest thank to being able to quickly react to changes in business rules and the market itself.

If you want to keep in touch with the author of this tutorial, feel free to add him vía [LinkedIn](https://www.linkedin.com/in/manuelro/). Stay tuned for the next cutting-edge technology implementation.
