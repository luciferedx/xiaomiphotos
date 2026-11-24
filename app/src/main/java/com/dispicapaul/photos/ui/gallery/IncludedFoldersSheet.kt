package com.dispicapaul.photos.ui.gallery

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.ModalBottomSheet
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.dispicapaul.photos.data.FolderIsolationRule
import com.dispicapaul.photos.ui.theme.LocalPhotosPalette
import kotlinx.collections.immutable.ImmutableList

@Composable
fun IncludedFoldersSheet(
    folders: ImmutableList<FolderIsolationRule>,
    onToggleFolder: (String) -> Unit,
    onResetCameraOnly: () -> Unit,
    onDismiss: () -> Unit
) {
    val palette = LocalPhotosPalette.current

    ModalBottomSheet(
        onDismissRequest = onDismiss,
        containerColor = palette.elevatedSheet,
        shape = RoundedCornerShape(topStart = 28.dp, topEnd = 28.dp)
    ) {
        Column(
            modifier = Modifier
                .fillMaxWidth()
                .navigationBarsPadding()
                .padding(horizontal = 20.dp)
        ) {
            Row(
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(
                    text = "Included Folders",
                    color = palette.primaryText,
                    fontSize = 18.sp,
                    fontWeight = FontWeight.Bold
                )
                TextButton(onClick = onResetCameraOnly) {
                    Text(
                        text = "Camera Only",
                        color = palette.accent,
                        fontSize = 13.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
            }

            Text(
                text = "Strict folder isolation keeps messaging apps and caches out of your main Library.",
                color = palette.secondaryText,
                fontSize = 12.sp
            )

            Spacer(Modifier.height(14.dp))

            LazyColumn(
                verticalArrangement = Arrangement.spacedBy(8.dp),
                modifier = Modifier
                    .fillMaxWidth()
                    .height(320.dp)
            ) {
                items(folders, key = { it.relativePath }) { rule ->
                    Row(
                        verticalAlignment = Alignment.CenterVertically,
                        horizontalArrangement = Arrangement.SpaceBetween,
                        modifier = Modifier
                            .fillMaxWidth()
                            .clickable { onToggleFolder(rule.relativePath) }
                            .padding(vertical = 6.dp)
                    ) {
                        Column(modifier = Modifier.weight(1f).padding(end = 12.dp)) {
                            Text(
                                text = "${rule.displayName} (${rule.itemCount})",
                                color = palette.primaryText,
                                fontSize = 14.sp,
                                fontWeight = FontWeight.SemiBold,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                            Text(
                                text = rule.relativePath,
                                color = palette.secondaryText,
                                fontFamily = FontFamily.Monospace,
                                fontSize = 11.sp,
                                maxLines = 1,
                                overflow = TextOverflow.Ellipsis
                            )
                        }
                        Switch(
                            checked = rule.isIncluded,
                            onCheckedChange = { onToggleFolder(rule.relativePath) }
                        )
                    }
                }
            }

            Spacer(Modifier.height(16.dp))
        }
    }
}
