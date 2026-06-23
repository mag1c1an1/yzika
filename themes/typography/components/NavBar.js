import { siteConfig } from '@/lib/config'
import SmartLink from '@/components/SmartLink'
import LazyImage from '@/components/LazyImage'
import { MenuList } from './MenuList'
import SocialButton from './SocialButton'

/**
 * 菜单导航
 * @param {*} props
 * @returns
 */
export default function NavBar(props) {
  const { siteInfo } = props
  return (
    // 1. Added `justify-between` to vertically space out the header, avatar, and nav on desktop.
    <div className='flex flex-col md:mt-20 md:h-[70vh]'>
      {/* Header section for the blog name */}
      <header className='w-fit self-center md:self-start md:pb-8 md:border-l-2 dark:md:border-white dark:text-white md:border-[var(--primary-color)] text-[var(--primary-color)] md:[writing-mode:vertical-lr] px-4 hover:bg-[var(--primary-color)] dark:hover:bg-white hover:text-white dark:hover:text-[var(--primary-color)] ease-in-out duration-700 md:hover:pt-4 md:hover:pb-4 mb-2'>
        <SmartLink href='/'>
          <div className='flex flex-col-reverse md:flex-col items-center md:items-start'>
            <div className='font-bold text-4xl text-center' id='blog-name'>
              {siteConfig('TYPOGRAPHY_BLOG_NAME')}
            </div>
            <div className='font-bold text-xl text-center' id='blog-name-en'>
              {siteConfig('TYPOGRAPHY_BLOG_NAME_EN')}
            </div>
          </div>
        </SmartLink>
      </header>

      {/* 2. Avatar/Icon section. Centered on mobile, left-aligned on desktop. */}
      <div className='flex-grow-[1] justify-center md:justify-start items-start flex'>
        <LazyImage
          priority={true}
          src={siteInfo?.icon}
          // 3. Added a subtle hover effect for better interactivity.
          className='rounded-full hover:scale-110 transform duration-200 hover:rotate-45 origin-center'
          width={50}
          height={50}
          alt={siteConfig('AUTHOR')}
        />
      </div>

      {/* 4. Navigation and Social buttons. Also centered on mobile and left-aligned on desktop. */}
      <nav className='flex-1 pt-1 md:pt-0 z-20 flex-shrink-0 self-center md:self-start'>
        <div
          id='nav-bar-inner'
          className='text-sm md:text-md text-center md:text-left'>
          <MenuList {...props} />
        </div>
        <SocialButton />
      </nav>
    </div>
  )
}
