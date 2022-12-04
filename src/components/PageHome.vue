<!-- eslint-disable max-len -->
<script setup>
import SimpleTitle from './SimpleTitle.vue';
import SimpleParagraph from './SimpleParagraph.vue';
import SimpleLink from './SimpleLink.vue';
import SimpleLayout from './SimpleLayout.vue';
import SimpleButton from './SimpleButton.vue';
import BreadcrumbNav from './BreadcrumbNav.vue';
import { useGlobalStore } from '../store';

const store = useGlobalStore();
store.title = null;
</script>

<template>
  <SimpleLayout>
    <template #main>
      <BreadcrumbNav class="flex font-bold">
        Hello, it's Manuel here.
        <img
          class="ml-2"
          width="28"
          src="/emoji-smile.png"
        />
      </BreadcrumbNav>

      <section class="sm:bg-gradient-to-b sm:from-slate-50 sm:to-slate-100 sm:px-16 sm:pt-8 lg:pt-10 sm:pb-16 sm:rounded-md sm:mt-4 flex-1">
        <SimpleTitle class="mt-4 sm:text-4xl lg:py-2">You’re looking for an ally, a partner.</SimpleTitle>
        <SimpleTitle class="font-bold sm:text-4xl xl:text-5xl lg:py-2">I’m glad you made it, you found me.</SimpleTitle>
        <SimpleParagraph class="mt-8 sm:text-2xl xl:text-3xl lg:leading-10">
          I can help out in enabling your end users to use your products
          and consultancy through user interfaces I develop backed up by science and research.
        </SimpleParagraph>
      </section>

      <div class="mt-4 text-xl sm:text-right">
        You can <SimpleLink to="/about">find out more.</SimpleLink>
      </div>
    </template>

    <template #footer>
      <div class="border-t border-slate-150 p-6 sm:hidden">
        <p class="text-xl">
          You’re right. <br>
          I specialize in Web User Interfaces.
        </p>

        <router-link to="consultancy">
          <SimpleButton class="text-xl mt-4 w-full">Reach out</SimpleButton>
        </router-link>
      </div>
    </template>
  </SimpleLayout>
</template>
