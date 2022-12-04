<script setup>
import { ref } from 'vue';
import SimpleTitle from './SimpleTitle.vue';
import SimpleParagraph from './SimpleParagraph.vue';
import SimpleLayout from './SimpleLayout.vue';
import BreadcrumbNav from './BreadcrumbNav.vue';
import TextField from './TextField.vue';
import SimpleButton from './SimpleButton.vue';
import IconUser from './Icon/IconUser.vue';
import IconMail from './Icon/IconMail.vue';
import { useGlobalStore } from '../store';

const store = useGlobalStore();
store.title = 'Ready for the next level?';

const description = ref('Hello!');
const name = ref('Manu');
const email = ref('mc_ro@msn.com');
const errors = ref(new Map());

function validateEmail(dirtyEmail) {
  const re = /\S+@\S+\.\S+/;
  return re.test(dirtyEmail);
}

function onInput(fieldname) {
  const REQUIRED = 'This field is a required one. Please enter a value.';
  const INVALID = 'This field has an invalid format. Please correct.';

  if (fieldname === 'name') {
    if (!name.value) {
      errors.value.set(fieldname, REQUIRED);
    } else {
      errors.value.delete(fieldname);
    }
  }

  if (fieldname === 'email') {
    if (!email.value) {
      errors.value.set(fieldname, REQUIRED);
    }

    if (email.value) {
      if (validateEmail(email.value)) {
        errors.value.delete(fieldname);
      } else {
        errors.value.set(fieldname, INVALID);
      }
    }
  }
}

function getError(fieldname) {
  return errors.value.get(fieldname);
}

function onSubmit(e) {
  e.preventDefault();

  fetch('./.netlify/functions/services', {
    method: 'POST',
    body: JSON.stringify({
      from: 'mc.ro18@gmail.com',
      to: 'mc_ro@msn.com',
      subject: 'Hello!',
    }),
  });
}
</script>

<template>
  <SimpleLayout>
    <template #main>
      <BreadcrumbNav />

      <SimpleTitle
        v-if="store.service"
        class="mt-4 font-bold"
      >A {{ store.service }}, then. A wise choice.</SimpleTitle>
      <SimpleTitle
        v-else
        class="mt-4 font-bold"
      >
        Let's break the ice.<br/>
        Tell me more about your project.
      </SimpleTitle>
      <SimpleParagraph class="mt-2">
        Besides technical consultancy,
        I love to also bring in best practices in Agile frameworks such as Scrum.
      </SimpleParagraph>

      <form
        @submit="onSubmit"
      >
        <label class="block pb-2 mt-4">A short description about your project</label>
        <TextField
          v-model="description"
          :value="description"
          placeholder="My business industry is..."
        />

        <label class="block pb-2 mt-4">My name is Manuel, what’s yours?</label>
        <TextField
          v-model="name"
          :value="name"
          :error="getError('name')"
          placeholder="Mine is..."
          required
          @input="() => onInput('name')"
        >
          <template #append>
            <IconUser class="mt-3 mr-3 text-gray-400" />
          </template>
        </TextField>

        <label class="block pb-2 mt-4">I’ll reach out to this email address</label>
        <TextField
          v-model="email"
          :value="email"
          :error="getError('email')"
          type="email"
          placeholder="@"
          required
          @input="() => onInput('email')"
        >
          <template #append>
            <IconMail class="mt-3 mr-3 text-gray-400" />
          </template>
        </TextField>

        <p class="text-base mt-4">
          You can also reach me out via <a class="text-blue-500 font-bold" href="https://www.linkedin.com/in/manuelro">LinkedIn.</a>
        </p>

        <SimpleButton
          type="submit"
          class="w-full mt-4 text-xl"
          :disabled="errors.size"
        >Submit</SimpleButton>
      </form>
    </template>
  </SimpleLayout>
</template>
