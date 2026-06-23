import { BeiAnGongAn } from '@/components/BeiAnGongAn'
import BeiAnSite from '@/components/BeiAnSite'
import DarkModeButton from '@/components/DarkModeButton'
import { siteConfig } from '@/lib/config'

/**
 * 页脚
 * @param {*} props
 * @returns
 */
export default function Footer(props) {
  const d = new Date()
  const currentYear = d.getFullYear()
  const since = siteConfig('SINCE')
  const copyrightDate =
    parseInt(since) < currentYear ? since + '-' + currentYear : currentYear

  return (
    <footer>
      <DarkModeButton className='pt-4' />

      <div className='font-bold text-[var(--primary-color)] dark:text-white py-6 text-sm flex flex-col gap-2 items-center'>
        <div>
          &copy;{`${copyrightDate}`} {siteConfig('AUTHOR')}
        </div>
        <div>保留所有权利</div>
        <p>
          <a
            href='https://creativecommons.org/licenses/by-nc/4.0/'
            target='_blank'>
            CC-BY-NC 4.0
          </a>
        </p>
        <a
          rel='license'
          href='https://creativecommons.org/licenses/by-nc/4.0/'
          target='_blank'>
          <img
            alt='知识共享许可'
            src='https://i.creativecommons.org/l/by-nc/4.0/88x31.png'
          />
        </a>
        <BeiAnSite></BeiAnSite>
        <BeiAnGongAn></BeiAnGongAn>
      </div>
    </footer>
  )
}
