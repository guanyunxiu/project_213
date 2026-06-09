<template>
  <el-container class="layout-container">
    <el-aside width="220px" class="layout-aside">
      <div class="logo">
        <el-icon size="28"><Document /></el-icon>
        <span>问卷管理系统</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        router
        background-color="#1f2d3d"
        text-color="#bfcbd9"
        active-text-color="#409EFF"
      >
        <el-menu-item index="/questionnaire">
          <el-icon><Menu /></el-icon>
          <span>问卷列表</span>
        </el-menu-item>
        <el-menu-item index="/template">
          <el-icon><Collection /></el-icon>
          <span>模板管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    <el-container>
      <el-header class="layout-header">
        <div class="header-left">
          <el-icon class="collapse-btn" @click="collapse = !collapse">
            <Fold v-if="!collapse" />
            <Expand v-else />
          </el-icon>
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ $route.meta.title }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="user-info">
              <el-avatar :size="32" :src="userStore.userInfo?.avatar">
                {{ userStore.userInfo?.username?.charAt(0)?.toUpperCase() }}
              </el-avatar>
              <span class="username">{{ userStore.userInfo?.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="logout">
                  <el-icon><SwitchButton /></el-icon>
                  退出登录
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      <el-main class="layout-main">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useUserStore } from '@/store/user'
import { ElMessageBox } from 'element-plus'
import { Document, Menu, Fold, Expand, ArrowDown, SwitchButton, Collection } from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()

const collapse = ref(false)

const activeMenu = computed(() => {
  if (route.path.startsWith('/questionnaire')) {
    return '/questionnaire'
  }
  if (route.path.startsWith('/template')) {
    return '/template'
  }
  return route.path
})

const handleCommand = async (command) => {
  if (command === 'logout') {
    try {
      await ElMessageBox.confirm('确定要退出登录吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })
      await userStore.handleLogout()
      router.push('/login')
    } catch (error) {
      if (error !== 'cancel') {
        console.error('Logout error:', error)
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
}

.layout-aside {
  background-color: #1f2d3d;
  transition: width 0.3s;

  .logo {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 18px;
    font-weight: bold;
    background-color: #1f2d3d;
    border-bottom: 1px solid #304156;

    el-icon {
      margin-right: 8px;
    }
  }

  :deep(.el-menu) {
    border-right: none;
  }
}

.layout-header {
  background-color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  box-shadow: 0 1px 4px rgba(0, 21, 41, 0.08);
  height: 60px;

  .header-left {
    display: flex;
    align-items: center;

    .collapse-btn {
      font-size: 20px;
      cursor: pointer;
      margin-right: 20px;
      color: #606266;

      &:hover {
        color: #409EFF;
      }
    }
  }

  .header-right {
    .user-info {
      display: flex;
      align-items: center;
      cursor: pointer;
      color: #606266;

      .username {
        margin: 0 8px;
        font-size: 14px;
      }

      .el-icon {
        font-size: 12px;
      }
    }
  }
}

.layout-main {
  background-color: #f5f7fa;
  padding: 20px;
  overflow-y: auto;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
