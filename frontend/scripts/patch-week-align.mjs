import fs from 'fs'

const p = 'src/components/calendario/CalendarioEscolarWeek.vue'
let s = fs.readFileSync(p, 'utf8')

const start = s.indexOf('    <div class="isolate flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">')
const end = s.indexOf('  </motionless>\n</template>', start)
const end2 = s.indexOf('  </div>\n</template>', start)
const endIdx = end2 >= 0 ? end2 : end

if (start < 0 || endIdx < 0) {
  console.error('markers', start, endIdx)
  process.exit(1)
}

const block = `    <motionless class="isolate flex min-h-0 flex-1 flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      <motionless
        class="sticky top-0 z-30 grid shrink-0 divide-x divide-gray-200 border-b border-gray-200 bg-gray-50 text-sm/6 text-gray-500 ring-1 ring-gray-200 dark:divide-white/10 dark:border-white/10 dark:bg-gray-950 dark:ring-white/20"
        :class="WEEK_GRID_COLS"
      >
        <motionless aria-hidden="true"></motionless>
        <button
          v-for="day in weekDays"
          :key="day.date"
          type="button"
          class="flex flex-col items-center justify-center gap-1 py-2.5 hover:bg-gray-100/80 sm:flex-row sm:gap-1.5 sm:py-3 dark:hover:bg-white/5"
          @click="selectDay(day.date)"
        >
          <span class="sm:hidden">{{ day.shortLabel }}</span>
          <span class="hidden sm:inline">{{ day.longLabel }}</span>
          <span
            :class="[
              'flex size-8 items-center justify-center font-semibold',
              day.isToday ? 'rounded-full bg-indigo-500 text-white' : 'text-gray-900 dark:text-white',
              day.isSelected && !day.isToday
                ? 'rounded-full ring-2 ring-indigo-500 ring-offset-1 ring-offset-gray-50 dark:ring-offset-gray-950'
                : '',
            ]"
          >{{ day.dayNum }}</span>
        </button>
      </motionless>

      <motionless class="min-h-0 flex-1 overflow-auto">
        <motionless class="relative grid min-h-[84rem] min-w-[40rem]" :class="WEEK_GRID_COLS" :style="ROWS_STYLE">
          <motionless
            class="h-7 border-b border-gray-200 dark:border-white/5"
            style="grid-column: 1 / -1"
            aria-hidden="true"
          ></motionless>

          <template v-for="h in hours" :key="h">
            <motionless
              class="sticky left-0 z-10 border-b border-gray-200 bg-gray-50 px-1 text-right text-xs/5 text-gray-500 dark:border-white/5 dark:bg-gray-950 dark:text-gray-400"
            >
              <span class="-mt-2 block pr-1">{{ hourLabel(h) }}</span>
            </motionless>
            <motionless
              v-for="dayIndex in 7"
              :key="\`\${h}-a-\${dayIndex}\`"
              class="border-b border-gray-200 dark:border-white/5"
            ></motionless>
            <motionless
              class="sticky left-0 z-10 border-b border-gray-200 bg-gray-50 dark:border-white/5 dark:bg-gray-950"
              aria-hidden="true"
            ></motionless>
            <motionless
              v-for="dayIndex in 7"
              :key="\`\${h}-b-\${dayIndex}\`"
              class="border-b border-gray-200 dark:border-white/5"
            ></motionless>
          </template>

          <ol
            class="pointer-events-none absolute inset-0 grid"
            :class="WEEK_GRID_COLS"
            :style="ROWS_STYLE"
          >
            <li
              v-for="ev in weekEvents"
              :key="\`\${ev.id}-\${ev.date}\`"
              class="pointer-events-auto relative mt-px flex before:pointer-events-none before:absolute before:inset-1 before:z-0 before:rounded-lg before:bg-gray-50 dark:before:bg-gray-950"
              :style="{ gridRow: \`\${ev.gridRow} / span \${ev.gridSpan}\`, gridColumnStart: ev.colStart }"
            >
              <a
                :href="ev.href"
                class="group absolute inset-1 z-10 flex flex-col overflow-y-auto rounded-lg p-2 text-xs/5"
                :class="toneClasses(ev.tone).bg"
                @click.prevent
              >
                <p class="order-1 font-semibold" :class="toneClasses(ev.tone).title">{{ ev.name }}</p>
                <p :class="toneClasses(ev.tone).time">
                  <time :datetime="ev.datetime">{{ ev.time }}</time>
                </p>
              </a>
            </li>
          </ol>
        </motionless>
      </motionless>
    </motionless>`

const clean = block.replace(/motionless/g, 'div')
s = s.slice(0, start) + clean + s.slice(endIdx)
fs.writeFileSync(p, s)
console.log('ok')
