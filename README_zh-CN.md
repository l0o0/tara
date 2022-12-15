<div align="center">
  <h1 align="center"><img class="center" src="./addon/chrome/skin/default/tara.png" alt="Icon">Tara</h1>
</div>

# Tara(_Taraxacum_)蒲公英

一个用于备份和恢复 Zotero 配置的插件，可以用在不同电脑间同步 Zotero 配置，也可以同一电脑上恢复 Zotero 的历史配置。  

可以备份的信息有：
+ Zotero 配置，包括插件的配置信息
+ Zotero 已安装插件
+ Zotero CSL 引文格式文件，具体在Zotero 目录下 styles 文件夹
+ Zotero 转换器在文件，具体在Zotero 目录下 translators 文件夹
+ Zotero locate 信息，具体在Zotero 目录下 locate 文件夹

未纳入备份的信息有：
1. Zotero或插件中配置的目录路径
2. Zotero同步账号


# 使用方法

点击[链接](https://github.com/l0o0/tara/releases)下载最新插件安装文件(右键另存为)，打开 Zotero -> 工具 -> 插件，在插件窗口，点开右上方的齿轮图标，点击 Install Add-on From File，找到下载的插件安装包。本插件安装后无需重启Zotero即使用。

安装成功后，插件功能按钮位于Zotero 小工具栏
![](./doc/1.png)

1. 创建备份，只须点击创建按钮，即可将当前Zotero的配置信息保存下来，配置信息打包成功后，会放在名为**Tara_Backup**条目下，自动按 Zotero 附件的同步方式进行同步
2. 导出备份用于将本机的Zotero各项配置和插件同步到另一台电脑的Zotero上。点击导出时，会在 Zotero 目录中创建一个 Backup 文件夹，并在文件夹内生成备份打包文件(xxxx_backup.zip)和tara.xpi的安装包。在另一台电脑Zotero上安装tara.xpi之后，再点击**恢复**，在弹出的窗口选择对应的备份打包文件。
3. 恢复备份是用于恢复已保存本机的历史备份(就是前面创建备份产生的)，在弹出的窗口中选择需要的文件进行恢复即可。

设置窗口中罗列了需要备份的信息，按需选择即可
![](./doc/2.png)

# ❤鸣谢

本插件使用了 [Zotero addon template](https://github.com/windingwind/zotero-addon-template) 模板
