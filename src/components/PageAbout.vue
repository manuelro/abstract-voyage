<script setup>
import SimpleTitle from './SimpleTitle.vue';
import SimpleParagraph from './SimpleParagraph.vue';
import SimpleLayout from './SimpleLayout.vue';
import SimpleButton from './SimpleButton.vue';
import IconHeart from './Icon/IconHeart.vue';
import SimpleList from './SimpleList.vue';
import ListItem from './ListItem.vue';
import SilverButton from './SilverButton.vue';
import BreadcrumbNav from './BreadcrumbNav.vue';
import { useGlobalStore } from '../store';

const store = useGlobalStore();
store.title = null;
</script>

<template>
  <SimpleLayout>
    <template #main>
      <BreadcrumbNav>
        I love
        <span class="px-1 text-red-500">
          <IconHeart />
        </span>
        pizza.
      </BreadcrumbNav>
      <SimpleTitle class="mt-4">
        I have helped develop
        <strong class="font-bold">user interfaces</strong>
        that have impacted
        <strong class="font-bold">millions</strong>
        of
        <strong class="font-bold">end users</strong>
        combined.
      </SimpleTitle>
      <SimpleParagraph class="mt-8">
        And have enabled hundreds of companies in the United States, Canada and Europe by:
      </SimpleParagraph>

      <SimpleList>
        <ListItem>Achieving their business goals.</ListItem>
        <ListItem>Increasing the end user satisfaction.</ListItem>
        <ListItem>Increasing overall retention rates.</ListItem>
      </SimpleList>
    </template>

    <template #footer>
      <div class="text-xl text-center border-t border-slate-150 px-6 py-8">
        <div class="px-8">I’m constantly meeting new valuable people. Let’s chat.</div>

        <SilverButton class="mt-4 w-full">
          <template #prepend>
            <img width="32" src="/waving-hand.png" />
          </template>

          Join my network

          <template #append>
            <img src="/linkedin.svg" />
          </template>
        </SilverButton>
      </div>

      <div class="border-t border-slate-150 p-6">
        <router-link to="/consultancy">
          <SimpleButton class="text-xl w-full">Inquiry about consultancy</SimpleButton>
        </router-link>
      </div>
    </template>
  </SimpleLayout>
</template>
