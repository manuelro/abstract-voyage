<script setup>
import { useRouter } from 'vue-router';
import SimpleTitle from './SimpleTitle.vue';
import SimpleParagraph from './SimpleParagraph.vue';
import SimpleLayout from './SimpleLayout.vue';
import OutlineButton from './OutlinedButton.vue';
import IconChevronRight from './Icon/IconChevronRight.vue';
import BreadcrumbNav from './BreadcrumbNav.vue';
import { useGlobalStore } from '../store';

const store = useGlobalStore();
store.title = 'Consultancy';

const router = useRouter();
function onServicePick(service) {
  store.service = service;
  router.push('contact');
}
</script>

<template>
  <SimpleLayout>
    <template #main>
      <BreadcrumbNav />
      <SimpleTitle class="mt-4 font-bold">Let us make the world a better place.</SimpleTitle>
      <SimpleParagraph class="mt-2">
        You’re probably curious at this point. What kind of application does your business need?
      </SimpleParagraph>

      <OutlineButton
        class="w-full flex mt-8"
        @click="() => onServicePick('Web application')"
      >
        <span class="pl-2">Web application</span>
        <span class="text-violet-500"><IconChevronRight /></span>
      </OutlineButton>

      <p class="px-4 mt-4">
        Any type of application for which the main mechanism to access it
        and use it is through an internet browser (Safari, Chrome, Firefox, among others.)
      </p>

      <OutlineButton
        class="w-full flex mt-12"
        @click="() => onServicePick('mobile application')"
      >
        <span class="pl-2">Mobile application</span>
        <span class="text-violet-500"><IconChevronRight /></span>
      </OutlineButton>

      <p class="px-4 mt-4">
        Any type of application for which the main mechanism to access it and
        use it is through the downloaded application from an application store
        (Apple Store, Android Store, Huawei Store.)
      </p>
    </template>
  </SimpleLayout>
</template>
