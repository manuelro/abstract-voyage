<template>
  <section class="flex flex-col justify-between h-screen sm:p-16 max-w-7xl">
    <header>
      <slot name="header" />
    </header>

    <section class="flex flex-auto flex-col p-6">
      <slot name="main" />
    </section>

    <footer>
      <slot name="footer" />
    </footer>
  </section>
</template>
